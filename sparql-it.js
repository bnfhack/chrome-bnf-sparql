
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


SELECT DISTINCT ?manif ?title ?date WHERE {

  ?expr bnfroles:${role} <${authorUri}#foaf:Person>.
  ?formerexpr owl:sameAs ?expr.
  ?manif rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title

  OPTIONAL {
    ?manif dcterms:date ?date.
  }

}`;

}


function hackDocumentSections(authorUri) {
    Array.from(document.querySelectorAll('.dtmanifs > h3 > a:first-child')).forEach(link => {
        const role = link.href.split('/').pop();
        const h3 = link.parentElement;
        h3.insertBefore(sparqlLink(authorDocsQuery(role, authorUri)), link);
    });
}


function hackAuthorPage(pageUri) {
    hackDocumentSections(pageUri);
}



if (document.querySelector('meta[property="og:type"]').content === 'author') {
    const pageUri = document.querySelector('link[rel=bookmark]').href;
    hackAuthorPage(pageUri);
}
