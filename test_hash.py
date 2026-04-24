from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
try:
    h = pwd_context.hash("admin123")
    print(f"Hash: {h}")
except Exception as e:
    print(f"Error: {e}")
