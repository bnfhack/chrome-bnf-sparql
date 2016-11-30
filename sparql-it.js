
function sparqlLink(query) {
    const a = document.createElement('a');
    a.className = 'sparql-link';
    a.href = `http://data.bnf.fr/sparql?query=${encodeURIComponent(query)}&format=${encodeURIComponent('text/html')}`;
    const img = document.createElement('img');
    img.src = 'http://data.bnf.fr/data/rdf.png';
    a.appendChild(img);
    a.appendChild(document.createTextNode('SPARQL-it!'));
    a.target = '_blank';
    return a;
}


function authorDocsQuery(role, authorUri) {
    return `
PREFIX bnfroles: <http://data.bnf.fr/vocabulary/roles/>
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
PREFIX dcterms: <http://purl.org/dc/terms/>


SELECT DISTINCT ?manif ?work ?title ?date ?type WHERE {

  ?expr dcterms:contributor <:${role} <${authorUri}#foaf:Person>.
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


function hackAuthorDocumentSections(authorUri) {
    Array.from(document.querySelectorAll('.dtmanifs > h3 > a:first-child')).forEach(link => {
        const role = link.href.split('/').pop();
        const h3 = link.parentElement;
        h3.insertBefore(sparqlLink(authorDocsQuery(role, authorUri)), link);
    });
}


function hackAuthorPage(pageUri) {
    hackAuthorDocumentSections(pageUri);
}


function hackWorkDocumentSections(workUri) {
    Array.from(document.querySelectorAll('.dtmanifs > h3')).forEach(h3 => {
        h3.insertBefore(sparqlLink(workDocsQuery(workUri)), h3.firstChild);
    });
}


function hackWorkPage(pageUri) {
    hackWorkDocumentSections(pageUri);
}


function guessPageType() {
    const ogtype = document.querySelector('meta[property="og:type"]');
    if (ogtype !== null) {
        return ogtype.content;
    }
}


let pageUri = document.querySelector('link[rel=bookmark]').href;

switch(guessPageType()) {
case 'author':
    hackAuthorPage(pageUri);
    break;
case 'book':
    hackWorkPage(pageUri);
    break;
}
