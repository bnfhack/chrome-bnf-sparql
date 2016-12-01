function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
}


function insertBefore(newNode, target) {
    target.parentElement.insertBefore(newNode, target);
}


function sparqlUrl(query, mimetype) {
    return `http://data.bnf.fr/sparql?query=${encodeURIComponent(query)}&format=${encodeURIComponent(mimetype || 'text/html')}`;
}


function executeQueryLink(query) {
    const a = document.createElement('a');
    a.className = 'sparql-link';
    a.title = 'Execute Query';
    a.href = sparqlUrl(query);
    const img = document.createElement('img');
    img.src = 'http://data.bnf.fr/data/rdf.png';
    a.appendChild(img);
    a.appendChild(document.createTextNode('SPARQL-it!'));
    a.target = '_blank';
    return a;
}


function resultsQueryLink(query) {
    const a = document.createElement('a');
    a.className = 'sparql-link';
    a.title = 'download results';
    a.href = sparqlUrl(query, 'application/sparql-results+json');
    a.appendChild(document.createTextNode('[json]'));
    a.target = '_blank';
    return a;
}


function openQueryLink(query) {
    const a = document.createElement('a');
    a.className = 'sparql sparql-openlink';
    a.title = 'Open Query Editor';
    a.href = `http://data.bnf.fr/sparql`;
    a.onclick = () => storeQuery(query);
    a.appendChild(document.createTextNode('[editor]'));
    a.target = '_blank';
    return a;
}

function sparqlLink(query) {
    const span = document.createElement('span')
    span.className = 'sparql-it';
    span.appendChild(executeQueryLink(query));
    span.appendChild(resultsQueryLink(query));
    span.appendChild(openQueryLink(query));
    return span;
}

function authorDocsQuery(role, authorUri) {
    return `
PREFIX bnfroles: <http://data.bnf.fr/vocabulary/roles/>
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
PREFIX dcterms: <http://purl.org/dc/terms/>


SELECT DISTINCT ?manif ?work ?title ?date ?type WHERE {

  ?expr bnfroles:${role} <${authorUri}#foaf:Person>.
  ?formerexpr owl:sameAs ?expr.
  ?manif rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title

  OPTIONAL {
    ?manif rdarelationships:workManifested ?work.
  }

  OPTIONAL {
    ?manif dcterms:date ?date.
  }

  OPTIONAL {
    ?formerexpr dcterms:type ?type.
  }

}`;
}

function workDocsQuery(workUri) {
    return `
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
PREFIX dcterms: <http://purl.org/dc/terms/>


SELECT DISTINCT ?manif ?title ?date ?type WHERE {

  ?manif rdarelationships:workManifested <${workUri}#frbr:Work> ;
         rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title

  OPTIONAL {
    ?manif dcterms:date ?date.
  }

  OPTIONAL {
    ?formerexpr dcterms:type ?type.
  }
}`;
}


function relatedAuthorsQuery(authorUri) {
    return `
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX bnfroles: <http://data.bnf.fr/vocabulary/roles/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?role1 ?manif ?title ?role2 ?author2 ?author2name WHERE {
  ?expr dcterms:contributor <${authorUri}#foaf:Person> ;
        ?role1 <${authorUri}#foaf:Person> ;
        ?role2 ?author2.

  ?author2 a foaf:Person;
       foaf:name ?author2name.

  ?formerexpr owl:sameAs ?expr.
  ?manif rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title.

  FILTER(regex(?role1, 'http://data.bnf.fr/vocabulary/roles'))
  FILTER(regex(?role2, 'http://data.bnf.fr/vocabulary/roles'))
  FILTER(?author2 != <${authorUri}#foaf:Person>)
}`;
}


function placesQuery() {
    return `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>

SELECT ?geo ?label ?lat ?lng ?geonames WHERE {

  ?geoconcept skos:closeMatch ?rameau ;
    skos:prefLabel ?label ;
    foaf:focus ?geo.

  OPTIONAL {
    ?geoconcept skos:exactMatch ?geonames.
    FILTER(regex(?geonames, 'http://sws.geonames.org/'))
  }

  ?geo geo:lat ?lat ;
       geo:long ?lng.

  ?rameau a skos:Concept.
}
`;
}


function storeQuery(query) {
    if (window.localStorage !== undefined) {
        localStorage.setItem('queryVal_main', JSON.stringify({val: query}));
    }
}


function hackAuthorDocumentSections(authorUri) {
    qsa('.dtmanifs > h3 > a:first-child').forEach(link => {
        const role = link.href.split('/').pop();
        const h3 = link.parentElement;
        h3.insertBefore(sparqlLink(authorDocsQuery(role, authorUri)), link);
    });
}


function hackRelatedAuthors(authorUri) {
    qsa(`.bloc-contenu a[href="http://data.bnf.fr/linked-authors/${authorUri.slice(32, 40)}"]`).forEach(a => {
        insertBefore(sparqlLink(relatedAuthorsQuery(authorUri)), a);
    });
}

function hackAuthorPage(pageUri) {
    hackAuthorDocumentSections(pageUri);
    hackRelatedAuthors(pageUri);
}


function hackWorkDocumentSections(workUri) {
    qsa('.dtmanifs > h3').forEach(h3 => {
        h3.insertBefore(sparqlLink(workDocsQuery(workUri)), h3.firstChild);
    });
}


function hackWorkPage(pageUri) {
    hackWorkDocumentSections(pageUri);
}


function hackHomePage() {
    const mapBlock = document.querySelector('#map-geo');
    insertBefore(sparqlLink(placesQuery()), mapBlock);
}


function guessPageType() {
    const ogtype = document.querySelector('meta[property="og:type"]');
    return ogtype ? ogtype.content : null;
}


let permalink = document.querySelector('link[rel=bookmark]'),
    pageUri = (permalink === null) ? null : permalink.href;

switch(guessPageType()) {
case 'author':
    hackAuthorPage(pageUri);
    break;
case 'book':
    hackWorkPage(pageUri);
    break;
case null:
    if (document.location.pathname === '/') {
        hackHomePage();
    }
}
