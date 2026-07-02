from sqlalchemy import Column, Integer, String, Float
from database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, default="demo@moneymind.com", index=True)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    desc = Column(String, nullable=True)
    date = Column(String, nullable=False)
    displayDate = Column(String, nullable=True)

class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, default="demo@moneymind.com", index=True)
    amount = Column(Float, nullable=False)
    source = Column(String, nullable=False)
    date = Column(String, nullable=False)

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, default="demo@moneymind.com", index=True)
    code = Column(String, default="IDR")
    symbol = Column(String, default="Rp")
    name = Column(String, default="Indonesian Rupiah")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

class ConfirmedLabel(Base):
    __tablename__ = "confirmed_labels"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, default="demo@moneymind.com", index=True)
    desc = Column(String, unique=False, nullable=False, index=True)
    category = Column(String, nullable=False)


class TelegramConnection(Base):
    __tablename__ = "telegram_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, unique=True, index=True, nullable=False)
    chat_id = Column(String, unique=True, index=True, nullable=True)
    auth_code = Column(String, unique=True, index=True, nullable=False)


