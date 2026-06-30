from sqlalchemy import Column, Integer, String, Float
from database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    desc = Column(String, nullable=True)
    date = Column(String, nullable=False)
    displayDate = Column(String, nullable=True)

class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    source = Column(String, nullable=False)
    date = Column(String, nullable=False)

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, default="USD")
    symbol = Column(String, default="$")
    name = Column(String, default="US Dollar")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
