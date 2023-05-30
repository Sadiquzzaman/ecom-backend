from itertools import product
from openpyxl import Workbook
from openpyxl import load_workbook
from openpyxl_image_loader import SheetImageLoader
import threading
import io
import requests
from PIL import Image
import time
import json


def current_milli_time():
  return round(time.time() * 1000)

class Point:
  x = int(0)
  y = int(0)
  def __init__(self, x, y) -> None:
    self.x = x
    self.y = y

class ProductImageDto:
  cover = ""
  gallery = []


class Product:
  token=""
  product={}
  cover = None
  gallery = None

  def coverImageTempUpload(self, image, imgType):
    ret = ""
    with requests.Session() as s:
      img = io.BytesIO()
      headers = {
        "Authorization": f"Bearer {self.token}",
        "Connection": "close"
      }
      payload={}
      url = 'http://localhost:3105/api/image-upload/product-redis'
      print(image)
      image.save(img, format=f"{image.format}")
      files=[
        ('image',(f"{imgType}-{current_milli_time()}.jpg", img.getvalue(), Image.MIME[image.format]))
      ]
      r = s.request("POST", url, headers=headers, data=payload, files=files)
      # self.cover.save(f"{self.name}-{current_milli_time()}.{self.cover.format}", f"{self.cover.format}")
      payload = r.text
      headers["Content-Type"] = "application/json"
      url = "http://localhost:3105/api/image-upload/product"
      r = requests.request("POST", url, headers=headers, data=payload)
      ret = json.loads(r.text)["filename"]
    return ret

  def galleryImageTempUpload(self, image, imgType):
    ret = ""
    with requests.Session() as s:
      img = io.BytesIO()
      headers = {
        "Authorization": f"Bearer {self.token}",
        "Connection": "close"
      }
      payload={}
      url = 'http://localhost:3105/api/image-upload/product-redis/gallery'
      print(image)
      image.save(img, format=f"{image.format}")
      files=[
        ('image',(f"{imgType}-{current_milli_time()}.jpg", img.getvalue(), Image.MIME[image.format]))
      ]
      r = s.request("POST", url, headers=headers, data=payload, files=files)
      # self.cover.save(f"{self.name}-{current_milli_time()}.{self.cover.format}", f"{self.cover.format}")
      payload = r.text
      headers["Content-Type"] = "application/json"
      url = "http://localhost:3105/api/image-upload/product"
      r = requests.request("POST", url, headers=headers, data=payload)
      ret = json.loads(r.text)["filename"]
    return ret

  def __str__(self):
    ret = "{"
    for key in self.product:
      ret += f'"{key}" : "{self.product[key]}",\n'
    # ret += f"coverImg -> {self.cover}\n"
    # ret += f"galleryImg -> {self.gallery}\n"
    ret +="}"
    return ret

class XlsImport(threading.Thread):
  products = []

  def __init__(self, xlsx, token, userInfo):
    threading.Thread.__init__(self)
    self.products = []
    wb = load_workbook(xlsx)
    ws = wb["products"]
    image_loader = SheetImageLoader(ws)
    header = {}
    try:
      first_row = list(ws.rows)[0]
      for cell in first_row:
        cellkey = f"{cell.column_letter}"
        header[cellkey] = cell.value
      for row in list(ws.rows)[1:]:
        product = Product()
        product.token = token
        product.product = {}
        for cell in row:
          cellkey = f"{cell.column_letter}{cell.row}"
          if image_loader.image_in(cellkey):
            try:
              if header[cell.column_letter] == "cover" :
                image = image_loader.get(cellkey)
                product.cover = image
              elif header[cell.column_letter] == "gallery" :
                image = image_loader.get(cellkey)
                product.gallery = image
              # image.save(f"{product.name}.{image.format}", f"{image.format}")
            except Exception as e:
              print(e)
          else:
            product.product[header[cell.column_letter]] = cell.value
        # print(product)
        product.product["userID"] = userInfo["userId"]
        self.products.append(product)
    except Exception as e:
      print(e)
    # print(self.products)
    
  
  def productUpload(self, product):
    ret = ""
    with requests.Session() as s:
      headers = {
        "Authorization": f"Bearer {product.token}",
        "Connection": "close"
      }
      payload=json.dumps(product.product)
      headers["Content-Type"] = "application/json"
      url = "http://localhost:3103/api/admin/products"
      r = requests.request("POST", url, headers=headers, data=payload)
      print(r.text)
      ret = json.loads(r.text)
    return ret
    
  def run(self):
    for prod in self.products:
      image = {}
      image["cover"] = prod.coverImageTempUpload(prod.cover, "cover")
      image["gallery"] = [prod.galleryImageTempUpload(prod.gallery, "gallery")]
      prod.product["image"] = image

      print(prod)
      self.productUpload(prod)
    # l = len(self.products)
    # print(l)
    # for i in range(l):
    #   pro = self.products[i]
    #   pro.sendImage()
    #   print(pro)
