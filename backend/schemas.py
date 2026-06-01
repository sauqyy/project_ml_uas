from pydantic import BaseModel
from typing import Optional

class ExpenseBase(BaseModel):
    amount: float
    category: str
    desc: Optional[str] = None
    date: str
    displayDate: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int

    class Config:
        from_attributes = True


class IncomeBase(BaseModel):
    amount: float
    source: str
    date: str

class IncomeCreate(IncomeBase):
    pass

class Income(IncomeBase):
    id: int

    class Config:
        from_attributes = True


class SettingBase(BaseModel):
    code: str
    symbol: str
    name: str

class SettingCreate(SettingBase):
    pass

class Setting(SettingBase):
    id: int

    class Config:
        from_attributes = True
