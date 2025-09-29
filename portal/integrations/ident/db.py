import os
from sqlalchemy import Column, Integer, String, DateTime, Boolean, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

IDENT_DB_PATH = os.getenv("IDENT_DB_PATH", r"D:\srv\ident_cache.db")
SQLALCHEMY_URL = f"sqlite:///{IDENT_DB_PATH}"

engine = create_engine(SQLALCHEMY_URL, echo=False, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True)
    patient_number = Column(String)
    status = Column(Integer)
    datetime_changed = Column(DateTime)

class Staff(Base):
    __tablename__ = "staffs"
    id = Column(Integer, primary_key=True)
    db_username = Column(String)
    archive = Column(Boolean)
    datetime_changed = Column(DateTime)

class ScheduledReception(Base):
    __tablename__ = "scheduled_receptions"
    id = Column(Integer, primary_key=True)
    id_patients = Column(Integer)
    id_staffs = Column(Integer)
    datetime_added = Column(DateTime)

class CallCache(Base):
    __tablename__ = "calls_cache"
    id = Column(Integer, primary_key=True)
    phone_in = Column(String)
    phone_out = Column(String)
    datetime_call = Column(DateTime)

class OnlineTicket(Base):
    __tablename__ = "online_tickets"
    id = Column(Integer, primary_key=True)
    patient_fullname = Column(String)
    staff_name = Column(String)
    plan_start = Column(DateTime)

def get_session():
    return SessionLocal()
