import pandas as pd
import numpy as np
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import IsolationForest
from statsmodels.tsa.arima.model import ARIMA
import warnings

warnings.filterwarnings('ignore')

# 1. NLP Category Classifier
def get_category_by_rule(text):
    teks = str(text).strip().lower()
    # 1. Kategori Transportasi
    if any(x in teks for x in ['grab', 'gojek', 'gocar', 'goride', 'grabbike', 'maxim', 'taxi', 'taksi', 'ojek', 'krl', 'bensin', 'pertamina']):
        return 'Transportation'
    # 2. Kategori Makanan
    elif any(x in teks for x in ['makan', 'minum', 'geprek', 'nasi', 'mie', 'bakso', 'kopi', 'cafe', 'coffee', 'gofood', 'grabfood', 'shopeefood', 'warung', 'kantin', 'snack', 'jajan', 'familymart', 'danusan']):
        return 'Food & Dining'
    # 3. Kategori Kebutuhan
    elif any(x in teks for x in ['alfamart', 'indomaret', 'alfa', 'indo', 'shopee', 'tokopedia', 'supermarket', 'beli', 'toko', 'baju', 'skincare', 'sabun', 'odol']):
        return 'Shopping'
    # 4. Selain itu masuk Lain-lain
    else:
        return 'Other'

def train_and_classify_categories(transactions):
    """
    Trains TF-IDF + LogisticRegression on the transactions using rule-based labeling,
    and returns predicted categories.
    """
    if not transactions:
        return []
    
    descriptions = [str(t.get('desc', '')) for t in transactions]
    rule_labels = [get_category_by_rule(d) for d in descriptions]
    
    # Check if we have at least 2 distinct classes
    unique_classes = set(rule_labels)
    if len(unique_classes) < 2:
        return rule_labels  # Fallback to rules directly
        
    try:
        vectorizer = TfidfVectorizer(max_features=200)
        X_text = vectorizer.fit_transform(descriptions)
        y_text = rule_labels
        
        model = LogisticRegression(max_iter=1000)
        model.fit(X_text, y_text)
        
        predictions = model.predict(X_text)
        return list(predictions)
    except Exception as e:
        print(f"Error training NLP model: {e}")
        return rule_labels

def train_and_predict_with_feedback(all_expenses, confirmed_labels_dict):
    """
    Trains TF-IDF + Logistic Regression on all expense descriptions.
    Uses confirmed_labels_dict (user feedback) as the ground truth,
    and falls back to rule-based labeling for unconfirmed descriptions.
    """
    if not all_expenses:
        return {}

    # Extract unique descriptions
    unique_descs = list(set(str(e['desc']).strip() for e in all_expenses if e.get('desc')))
    if not unique_descs:
        return {}

    # Build training labels
    y_train = []
    for desc in unique_descs:
        if desc in confirmed_labels_dict:
            y_train.append(confirmed_labels_dict[desc])
        else:
            y_train.append(get_category_by_rule(desc))

    # If we don't have enough classes, fall back to rule-based labeling
    if len(set(y_train)) < 2:
        # Predict directly using rules / confirmed labels
        predictions_map = {desc: (confirmed_labels_dict[desc] if desc in confirmed_labels_dict else get_category_by_rule(desc)) for desc in unique_descs}
        return predictions_map

    try:
        # Train model
        vectorizer = TfidfVectorizer(max_features=200)
        X_train = vectorizer.fit_transform(unique_descs)
        
        model = LogisticRegression(max_iter=1000)
        model.fit(X_train, y_train)

        # Predict for all unique descriptions
        X_predict = vectorizer.transform(unique_descs)
        y_pred = model.predict(X_predict)

        # Map description to predicted category
        predictions_map = {desc: pred for desc, pred in zip(unique_descs, y_pred)}
        
        # Overwrite predictions with confirmed labels to guarantee user choices are respected
        for desc, confirmed_cat in confirmed_labels_dict.items():
            predictions_map[desc] = confirmed_cat

        return predictions_map
    except Exception as e:
        print(f"Error in interactive training: {e}")
        # Fallback to direct mapping
        return {desc: (confirmed_labels_dict[desc] if desc in confirmed_labels_dict else get_category_by_rule(desc)) for desc in unique_descs}

# 2. Outlier Detection using Isolation Forest
def detect_anomalies_iso_forest(expenses):
    """
    Runs Isolation Forest on expense amounts.
    Returns list of expense dicts classified as anomalies.
    """
    if len(expenses) < 5:
        return []  # Not enough data to train Isolation Forest
        
    try:
        amounts = np.array([float(e['amount']) for e in expenses]).reshape(-1, 1)
        
        # Isolation Forest with contamination 3% (from notebook)
        iso_forest = IsolationForest(contamination=0.03, random_state=42)
        preds = iso_forest.fit_predict(amounts)
        
        anomalies = []
        for idx, pred in enumerate(preds):
            if pred == -1:  # -1 represents an anomaly
                e = expenses[idx]
                anomalies.append({
                    "id": e['id'],
                    "category": e['category'],
                    "amount": float(e['amount']),
                    "title": "Pengeluaran Tidak Wajar (Anomaly)",
                    "description": f"Transaksi '{e['desc']}' sebesar {float(e['amount']):,.2f} terdeteksi sebagai pengeluaran tidak wajar (pencilan) oleh model AI Isolation Forest.",
                    "severity": "high" if float(e['amount']) > np.percentile(amounts, 90) else "medium",
                    "date": e['date']
                })
        # Sort by amount descending
        anomalies.sort(key=lambda x: x['amount'], reverse=True)
        return anomalies
    except Exception as e:
        print(f"Error running Isolation Forest: {e}")
        return []

# 3. ARIMA Forecasting
def get_arima_forecast_5days(expenses):
    """
    Groups expenses by date, runs ARIMA(1,1,1) daily forecasting,
    and returns predictions for the next 5 days.
    """
    if not expenses:
        return []
        
    try:
        # Construct DataFrame
        df_exp = pd.DataFrame(expenses)
        df_exp['date'] = pd.to_datetime(df_exp['date'])
        
        # Group daily
        ts_data = df_exp.groupby('date')['amount'].sum()
        
        # Ensure chronological daily frequency without gaps
        all_dates = pd.date_range(start=ts_data.index.min(), end=ts_data.index.max(), freq='D')
        ts_data = ts_data.reindex(all_dates, fill_value=0.0)
        
        if len(ts_data) < 7:
            # Not enough data for ARIMA, return simple projection
            mean_val = ts_data.mean()
            last_date = ts_data.index[-1]
            future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=5, freq='D')
            return [
                {
                    "date": d.strftime("%Y-%m-%d"),
                    "amount": round(mean_val, 2)
                } for d in future_dates
            ]
            
        # Fit ARIMA(1,1,1) (from notebook)
        model = ARIMA(ts_data.values, order=(1, 1, 1))
        model_fit = model.fit()
        
        # Forecast 5 days
        forecast = model_fit.forecast(steps=5)
        # Prevent negative predictions
        forecast = np.clip(forecast, 0, None)
        
        last_date = ts_data.index[-1]
        future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=5, freq='D')
        
        predictions = []
        for i, d in enumerate(future_dates):
            predictions.append({
                "date": d.strftime("%Y-%m-%d"),
                "amount": round(float(forecast[i]), 2)
            })
            
        return predictions
    except Exception as e:
        print(f"Error running ARIMA: {e}")
        return []
