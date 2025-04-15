import bcrypt

def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using bcrypt and returns the hashed password as a string.
    """
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compares a plaintext password with the hashed password.
    Returns True if they match, False otherwise.
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
