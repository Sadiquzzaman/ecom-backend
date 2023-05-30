from encodings import utf_8
from flask import Flask, render_template, request, Response
import os
import redis
import json 
from dotenv import dotenv_values
from xls_parse import XlsImport, current_milli_time

env = f'.{ os.environ["NODE_ENV"] }' if len(os.environ["NODE_ENV"]) else ""
config = dotenv_values(f"../../env/.env{ env }")
app = Flask(__name__)
print(config['REDIS_SESSION'])
r = redis.Redis.from_url(url=f'{config["REDIS_SESSION"]}')
print(r)

@app.route("/")
def index():
  return render_template('index.html')

@app.route("/file", methods=['POST'])
def files():
  if request.method == 'POST':
    token = ""
    try :
      # print(request.headers)
      if "Authorization" not in request.headers:
        raise Exception("Token is not found in request header")
      authorization = request.headers['Authorization']
      bears = authorization.split(" ")
      # print(bears)
      if len(bears) < 1 :
        raise Exception("Token is not found in request header")
      token = bears[1]
    except Exception as err:
      # print(err)
      errMsg = json.dumps({
        "nonce": current_milli_time(),
        "status": 401,
        "message": "Token is not found in request header",
        "error": {
          "fields": None,
          "system": {
            "domain": "UNAUTHORIZED",
            "value": "Error",
            "message": "Token is not found in request header"
          }
        },
        "payload": None
      })
      return Response( errMsg, status=401, mimetype='application/json')
    userInfo = json.loads(r.get(f'{token}'))
    print(userInfo)
    file = request.files['xlsx']
    # print(token)
    xls = XlsImport(xlsx = file, token=token, userInfo=userInfo)
    xls.start()
  return {"f": "asd"}

if __name__ == "__main__":
  print("server is running on http://localhost:3112/")
  app.run(debug=True, host='0.0.0.0', port=3112)
  # from waitress import serve
  # serve(app, host="0.0.0.0", port=3112)

