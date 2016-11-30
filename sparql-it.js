function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
}

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


function hackAuthorDocumentSections(authorUri) {
    qsa('.dtmanifs > h3 > a:first-child').forEach(link => {
        const role = link.href.split('/').pop();
        const h3 = link.parentElement;
        h3.insertBefore(sparqlLink(authorDocsQuery(role, authorUri)), link);
    });
}


function hackRelatedAuthors(authorUri) {
    qsa(`.bloc-contenu a[href="http://data.bnf.fr/linked-authors/${authorUri.slice(32, 40)}"]`).forEach(a => {
        a.parentElement.insertBefore(sparqlLink(relatedAuthorsQuery(authorUri)), a);
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
