async function makeFixedLayout(buffer, JSZip) {
  const zip = await JSZip.loadAsync(buffer);
  const opfPath = 'OEBPS/content.opf';
  let opf = await zip.file(opfPath).async('string');
  opf = opf.replace(/<package\b([^>]*)>/, (tag, attrs) => {
    attrs = attrs.replace(/\bversion="[^"]*"/, 'version="3.0"');
    if (!/xmlns:rendition=/.test(attrs)) attrs += ' xmlns:rendition="http://www.idpf.org/vocab/rendition/#"';
    if (!/xmlns:dcterms=/.test(attrs)) attrs += ' xmlns:dcterms="http://purl.org/dc/terms/"';
    return '<package' + attrs + '>';
  });
  opf = opf.replace(/<metadata\b[^>]*>/, tag => tag + '\n        <meta property="rendition:layout">pre-paginated</meta>\n        <meta property="rendition:spread">none</meta>\n        <meta property="dcterms:modified">' + new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') + '</meta>');
  opf = opf.replace('</manifest>', '        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n    </manifest>');
  zip.file(opfPath, opf);

  const navPath = 'OEBPS/nav.xhtml';
  zip.file(navPath, '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n<head><title>Contents</title></head>\n<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol><li><a href="0000.html">Game Start</a></li></ol></nav></body>\n</html>');

  const pagePaths = Object.keys(zip.files).filter(path => /^OEBPS\/[^/]+\.html$/.test(path));
  await Promise.all(pagePaths.map(async path => {
    let page = await zip.file(path).async('string');
    if (!/<meta\s+name="viewport"/.test(page)) {
      page = page.replace(/<head>/i, '<head>\n<meta name="viewport" content="width=600,height=800"/>');
    }
    zip.file(path, page);
  }));
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}