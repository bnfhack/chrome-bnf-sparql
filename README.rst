=================================
 data.bnf.fr sparql-it extension
=================================

BnF-SparqlIt is a chrome extension that adds extra links
to data.bnf.fr web pages and ease SPARQL querying.

For example, in a document section of an author page, it will
add links to fetch the corresponding documents in the SPARQL endpoint.

The encoded SPARQL is purposely simple but you can click on the
"editor" link to edit it rather than to execute it directly. It will
then be a basis for more specific needs that you could have.


Permissions required
====================

The only permission required is to access the current tab's DOM
content.


Queries - disclaimer
====================

SPARQL queries might not return the *exact* same results as you would
find in the web interface, for at least 3 reasons:

- some information is not (yet) available in the tripletore (e.g.  the
  exact document type or the "analytic" records),

- the web interface sometimes performs clustering of documents into
  "works" dynamically and doing this in a single SPARQL query would
  hard if not impossible.

- there might be bugs around there ;-)


Local installation
==================

1. clone the repository or download an archive and unzip it

2. open chrome

3. in the url location bar, type ``chrome://extensions``

4. check the *developer mode*

5. click on  ``Load unpacked extensions``

6. select the directory created at step 1

7. go to http://data.bnf.fr and enjoy!


Firefox installation
--------------------

Thanks to WebExtensions_, since the code is pretty straightforward at this point,
the plugin can also be installed in Firefox:

1. clone the repository or download an archive and unzip it

2. open firefox

3. in the url location bar, type ``about:debugging``

4. check ``Load Temporary Add-on``

5. select the ``manifest.json`` file in the directory created at step 1

6. go to http://data.bnf.fr and enjoy!



.. _WebExtensions: https://developer.mozilla.org/fr/Add-ons/WebExtensions


Installation trhough {Mozilla,Chrome} web store
===============================================

Not available yet.


