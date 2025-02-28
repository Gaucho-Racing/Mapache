from sqlalchemy import create_engine
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("DATABASE_URL")

conn = create_engine(database_url)

def run_query(query): #returns pandas dataframe
    return pd.read_sql(query, conn)