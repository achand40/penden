import json 
from flask import jsonify 
from threading import Thread
import requests
from urllib.parse import urlparse, urljoin


def send_first_indexing_request(client_data,url, INDEXING_URL, PASSWORD): 

#  This function takes the data from the client and starts indexing it. We do not wait for this function to finish running
    interim_data = []
    index_name = client_data['index_name']
    data = client_data["data"]
    for j in range(0, len(data)):
        phrase = data[j]['phrase']
        text = phrase[0].replace('\n', '').replace('\t', '').strip()
        interim_data.append({"text" : text, "xpath" : phrase[1], "typeof" : phrase[2], "contenturl" : phrase[3], "is_crawl" : "False"})
    print(interim_data)   
    result = requests.post(INDEXING_URL, json = {"url" : url, "parent_domain" : "null",  "data" : interim_data, "password" : PASSWORD, "index_name" : "production_primary", "model_type" : "small"})
    print(str(result.status_code))

def prepare_list_for_scraper(data):
   final_list = []
   data = data['data']
   for j in range(0, len(data)):
       phrase = data[j]['phrase']
       typeof = phrase[2]

       if typeof == "a": 
         final_list.append((phrase[3], phrase[0]))
   return final_list

def index_link_data(returned_data, list_to_send_to_scraper, MAIN_DOMAIN, PASSWORD, INDEXING_URL):
      temp_check_list = []
      for i in list_to_send_to_scraper: 
        if i[0] not in temp_check_list: 
          temp_check_list.append(i[0])

      final_list = []


      for i in returned_data: 
        url = i[0]
        text = i[1]

        if url not in temp_check_list:
           final_list.append({"text" : text, "xpath" : "null", "typeof" : "a", "contenturl" : url, "is_crawl" : "True"})
        else: 
           print(url)
      print(len(final_list))
      print(len(list_to_send_to_scraper) - len(final_list))
      result = requests.post(INDEXING_URL, json = {"url" : "null", "parent_domain" : MAIN_DOMAIN, "data" : final_list, "password" : PASSWORD, "index_name" : "production_primary", "model_type" : "small"})
      return result

def main(request):

    if request.method == 'OPTIONS':
        # Allows GET requests from any origin with the Content-Type
        # header and caches preflight response for an 3600s
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }

        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    request_json = request.get_json()
    url = request_json['url']
    client_data = request_json
    index_name = request_json['index_name']
    is_present = request_json['is_present']
    index_name = "production_primary"
    full_or_partial = request_json['full_or_partial']
    PASSWORD = 'MITblinder##'
    INDEXING_URL = 'http://165.232.180.22:83/index' #redundant, replace with your own hosted model
    MAIN_DOMAIN = urlparse(url).netloc

    if full_or_partial == "full":
        Thread(target=send_first_indexing_request, args = ((client_data, url, INDEXING_URL, PASSWORD))).start()
        #----
        list_to_send_to_scraper = prepare_list_for_scraper(client_data)
        resp = requests.post('https://us-central1-ey-project-315506.cloudfunctions.net/link-extractor-and-proxy-parent', json = {'domain' : MAIN_DOMAIN, 'list' : list_to_send_to_scraper })
        returned_data = resp.json()['all_urls']
        #----
        result = index_link_data(returned_data, list_to_send_to_scraper, MAIN_DOMAIN, PASSWORD, INDEXING_URL)
        return (jsonify({"text_list" :"Success"}), 200, headers)
    
    elif full_or_partial == "partial":
        Thread(target=send_first_indexing_request, args = ((client_data, url, INDEXING_URL, PASSWORD))).start()
        return (jsonify({"text_list" :"Success"}), 200, headers)


