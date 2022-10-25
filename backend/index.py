#GCP function to index the data 
#All endpoints and API keys redundant, replace with own.

import requests 
import json
import uuid 
from urllib.parse import urlparse

#Variables 
EMBEDDING_URL = 'https://emb-4fu5zwy24a-de.a.run.app/embed'
INDEX_NAME = 'production_primary'
ELASTIC_KEY = 'key'


def convert_to_jsnolines(array):


  """Converts an array into the correct form for ES index"""
  main = ''
  for element in array: 
    main += json.dumps(element)
    main += "\n"
  final =  bytes(main, 'utf-8')
  return final


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

    client_data = request.get_json()

  # Parsing the data from the client and making into a format to be used in this function
    interim_data = []
    index_name = client_data['index_name']
    data = client_data["data"]
    for j in range(0, len(data)):
        phrase = data[j]['phrase']
        text = phrase[0].replace('\n', '').replace('\t', '').strip()
        interim_data.append({"text" : text, "xpath" : phrase[1], "typeof" : phrase[2], "contenturl" : phrase[3], "is_crawl" : "False"})

  # Extract all the text elements and send them to get the embeddings  
    only_text = []
    for i in interim_data:
      only_text.append(i['text'])
    
    vecs = requests.post(EMBEDDING_URL, json = {"query" : only_text} )
    vec = vecs.json()['encodings']
    final_data = []

#   Getting the data into the final form to index it into ES index 
    for iter in range(0, len(interim_data)):
      present = interim_data[iter]
      payload_header = { "index" : { "_index": INDEX_NAME ,  "_id" : "Penden_" + str(uuid.uuid4()) } }
      final_data.append(payload_header)
      final_data.append({"website_name" : urlparse(client_data['url']).netloc, "ids" : client_data['url'], "text_vector" :  vec[iter], "text" : present['text'], 
                          "xpath" : present['xpath'], "typeof" : present['typeof'], "parent_domain" : urlparse(present['contenturl']).netloc, 
                          "iscrawl" : "false", "contenturl" : present["contenturl"]})
   
   # Converting to jsonlines + binary format 
    data_to_be_sent = convert_to_jsnolines(final_data)

    headers_elastic = {
            'Content-Type': 'application/json',
        }

    response = requests.post('https://penden-5march.es.us-central1.gcp.cloud.es.io:9243/_bulk', headers=headers_elastic, data=data_to_be_sent, timeout=60, auth = HTTPBasicAuth('elastic', ELASTIC_KEY))
    
    if response.status_code == 200 or response.status_code == 201:
      return (jsonify({"Status" : "Indexing Successful"}), 200, headers)
    
    else: 
       return (jsonify({"Status" : "Indexing ERROR. Check logs"}), 200, headers)

