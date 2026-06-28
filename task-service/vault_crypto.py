import os
from cryptography.fernet import Fernet

_KEY_FILE = os.path.join(os.path.dirname(__file__), ".vault.key")
_fernet: Fernet | None = None


def _load_key() -> bytes:
    key_env = os.getenv("VAULT_KEY")
    if key_env:
        return key_env.encode()
    if os.path.exists(_KEY_FILE):
        with open(_KEY_FILE, "rb") as f:
            return f.read().strip()
    # First run: generate and save
    key = Fernet.generate_key()
    with open(_KEY_FILE, "wb") as f:
        f.write(key)
    return key


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_load_key())
    return _fernet


def encrypt(text: str) -> str:
    return _get_fernet().encrypt(text.encode()).decode()


def decrypt(token: str) -> str:
    return _get_fernet().decrypt(token.encode()).decode()
