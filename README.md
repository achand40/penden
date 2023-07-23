# [Penden](https://penden.webflow.io/)

## 1. Abstract 
Screen readers are the primary tool through which Blind and Low Vision (BLV) people use the internet. However, 98.1% of the websites on the internet do not meet WCAG AA guidelines, minimum for a usable experience. In tests conducted (n = 44), the average increase in time taken to complete a task by a screen reader user as compared to a sighted user was a factor of 9.2. Penden solves this problem via a browser extension that provides a pop-up, enabling users to semantically search any element on a website. Hence, users are able to interact with a large part of a website through Penden’s search itself. When a user arrives on a page, Penden extracts all interactable elements in the website and transforms them into vector representation. For this, a fine-tuned, distilled, RoBERTa based model was used. The vector representations are then stored in an ANN-based search index. When a user searches for a term or phrase, Penden converts the query into a vector and uses cosine similarity to search against the index. Once a favourable result is found, Penden automatically brings the focus of the screen reader to the selected element. Penden is fully compatible with all major screen readers including JAWS, VoiceOver and NVDA. In trials (n = 56), users on average completed their assigned tasks 647% faster with Penden than without it. Qualitative feedback received also supports this claim, with users registering positive feedback.  With Penden, visually challenged users can now more reliably and efficiently use the internet. 

## 2. Architecture 
### 2.1 Model
Penden uses a distilled, fine-tuned RoBERTa model to generate the embeddings for searchable items on a website. We use a RoBERTa-base model fine-tuned on a proprietary dataset. The dataset contained 3,977 pairs of sentences and corresponding search results scraped from various websites. The base model was fine-tuned using a siamese head. The trained model has been released on Hugging Face transformers. 
![erre](https://github.com/achand40/penden/assets/116143192/a72efc17-cb97-4cd5-8e47-dcde4bca0b7e)

### 2.2 Frontend

The app is delivered via an iFrame. This ensures that the app does not interfere with any part of the website’s functionality. Upon a site loading, the app performs a DB requests to check whether the website has already been indexed recently. If not, it retrieves all visible elements (div, heading tags, img, etc.) and send it to be converted into embeddings and indexed. 

Once the user presses the shortcut key (CMD + ALT + T), the app provides users the ability to search for any task they wish to perform. The frontend displays the semantically closest hits. Users can then with a click navigate to their desired position on the website. The frontend is compatible with all major screen readers.

### 2.3 Backend
The backend is made of a Flask instance, with the fine-tuned model loaded hot. Once it receives the contents of the website, it cleans, removes duplicates and uses the model to generate the embeddings and index into an ElasticSearch instance. 

Similarly, once the query has been received, the embeddings for the query are generated. This is then compared to the indexed queries in ElasticSearch using cosine similarity. The top hits are sent back along with the XPaths for the front end to identify the elements. 


## 3. Running Penden Locally 
1. Clone the repo
2. Run ```index.py``` and ```semantic_search.py``` and make sure the Flask servers are running.
3. Edit the ```content.js``` and make sure it is pointed to the correct endpoints. 
4. Download the ```frontend``` folder and upload it as a chrome extension. More details on how this can be done can be found [here](https://medium.com/geekculture/how-i-build-and-publish-a-chrome-extension-e8fe37c0f578)
5. Open any website and press CMD + ALT + T.
  

## 4. Demo
[![Penden Demo](https://img.youtube.com/vi/uqwYkZBET0I/0.jpg)](https://www.youtube.com/watch?v=uqwYkZBET0I)
 
