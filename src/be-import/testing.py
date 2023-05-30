import requests
import json
url = "http://localhost:3102/api/auth/login"

payload={
  "phone": "01957206205",
  "email": "string",
  "password": "s1234",
  "isChecked": 0
}
headers = {"Content-Type": "application/json"}
response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
res = json.loads(response.text)
# print(res)
token = res["payload"]["data"]["accessToken"]
# print(token)
url = "http://localhost:3112/file"

payload={}
files=[
  ('xlsx',('a.xlsx',open('./products.xlsx','rb'),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))
]
headers = {
  'Authorization': f'Bearer {token}'
}

response = requests.request("POST", url, headers=headers, data=payload, files=files)

print(response.text)
