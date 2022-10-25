#GCP function to perform the semantic search 
import requests 
from flask import jsonify
import json 

ELASTIC_KEY = 'GaxwzwzVxs8mfsyEaNOzytSg'
LINK_TO_SEARCH = 'https://penden-5march.es.us-central1.gcp.cloud.es.io:9243/production_primary/_search'

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
    query = client_data['query']
    domain = client_data['domain']


    vecs = requests.post('https://emb-4fu5zwy24a-de.a.run.app/embed', json = {"query" : [query]} )
    vec = vecs.json()['encodings']


    ES_QUERY = {
            "size" : 2, 
            "query": {
              "script_score": {
                  "query": {
                      "terms" : {
                          "ids" : [domain]
                      }

                },

                "script": {
                  "source": "cosineSimilarity(params.queryVector, 'text_vector')+ 1.0",
                  "params": {
                    "queryVector": vec[0]
                  }
                }
              }

            },
                        "_source": {"includes": ["website_name", "text","xpath", "typeof", "contenturl"]}


            }

    response = requests.post(LINK_TO_SEARCH, headers=headers, json=ES_QUERY, timeout=60, auth = HTTPBasicAuth('elastic', ELASTIC_KEY))
    data = response.json()['hits']['hits']
    final_data = []
    for iter in range(0, len(data)):
      inter = data[iter]['_source'] 
      final_data.append({"text" : inter['text'], "typeof" : inter['typeof'], "website_name" : inter["website_name"],
                        "contenturl" : inter["contenturl"], "xpath" : inter["xpath"]})
    
    return jsonify({"data" : final_data})
