import requests
import json
import sys
from datetime import datetime, timedelta
import secrets

GITHUB_TOKEN = "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"
GIST_ID = "2ad2730ba358ac7593fc1376303cb9c7"

class KeyManager:
    def __init__(self, token, gist_id):
        self.token = token
        self.gist_id = gist_id
        self.headers = {
            'Authorization': f'token {token}',
            'Content-Type': 'application/json'
        }
    
    def load_keys(self):
        try:
            response = requests.get(
                f'https://api.github.com/gists/{self.gist_id}',
                headers=self.headers
            )
            data = response.json()
            content = data['files']['keys_db.json']['content']
            return json.loads(content)
        except:
            return []
    
    def save_keys(self, keys):
        try:
            requests.patch(
                f'https://api.github.com/gists/{self.gist_id}',
                headers=self.headers,
                json={
                    'files': {
                        'keys_db.json': {
                            'content': json.dumps(keys, indent=2, ensure_ascii=False)
                        }
                    }
                }
            )
            return True
        except:
            return False
    
    def generate_key(self):
        return secrets.token_hex(16).upper()
    
    def create_key(self, hours, note):
        keys = self.load_keys()
        
        key = self.generate_key()
        now = datetime.now()
        expires = now + timedelta(hours=hours)
        
        new_key = {
            'key': key,
            'createdAt': now.isoformat(),
            'expiresAt': expires.isoformat(),
            'note': note
        }
        
        keys.append(new_key)
        
        if self.save_keys(keys):
            print(key)
            return True
        else:
            return False

if __name__ == '__main__':
    km = KeyManager(GITHUB_TOKEN, GIST_ID)
    
    if len(sys.argv) > 1 and sys.argv[1] == 'create':
        hours = int(sys.argv[2])
        note = sys.argv[3] if len(sys.argv) > 3 else ''
        km.create_key(hours, note)
