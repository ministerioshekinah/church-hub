// Six TLS handshakes and two HTTP-upgrade checks on the authorized hostnames.
// No HTTP bodies, authentication, port scan, cipher enumeration, or writes.
const tls = require('node:tls');
const fs = require('node:fs');
const path = require('node:path');

async function httpsRedirect(hostname) {
  const started = Date.now();
  try {
    const response = await fetch(`http://${hostname}/`, {redirect:'manual',signal:AbortSignal.timeout(10000)});
    const location = response.headers.get('location');
    await response.body?.cancel();
    let destination;
    try {destination = new URL(location);} catch { /* Invalid locations fail verification below. */ }
    return {hostname,status:response.status,location,durationMs:Date.now()-started,
      verified:[301,302,307,308].includes(response.status)&&destination?.protocol==='https:'&&['mcshekinah.org','www.mcshekinah.org'].includes(destination?.hostname)};
  } catch(error) {
    return {hostname,verified:false,durationMs:Date.now()-started,error:error.cause?.code||error.name,detail:error.message};
  }
}

function handshake(hostname, version) {
  return new Promise(resolve => {
    const started = Date.now();
    let finished = false;
    let socket;
    const timer = setTimeout(() => finish({connected:false,error:'TIMEOUT'}), 10000);
    function finish(result) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket?.destroy();
      resolve({hostname,requestedVersion:version,durationMs:Date.now()-started,...result});
    }
    try {
      socket = tls.connect({
        host:hostname,port:443,servername:hostname,
        minVersion:version,maxVersion:version,
        // Explicit public roots avoid treating a local interception CA as
        // evidence for the origin certificate. Hostname/expiry checks stay on.
        ca:tls.rootCertificates,rejectUnauthorized:true,
        // Legacy probes permit a ClientHello; successful negotiation is a
        // finding. The site's browser clients never use this test setting.
        ...(['TLSv1','TLSv1.1'].includes(version)?{ciphers:'DEFAULT:@SECLEVEL=0'}:{}),
        ALPNProtocols:['h2','http/1.1']
      });
      socket.once('secureConnect', () => {
        const cert=socket.getPeerCertificate(true);
        const chain=[];const fingerprints=new Set();let current=cert;
        while(current?.fingerprint256&&!fingerprints.has(current.fingerprint256)&&chain.length<8) {
          fingerprints.add(current.fingerprint256);
          chain.push({subject:current.subject,issuer:current.issuer,validFrom:current.valid_from,validTo:current.valid_to,fingerprint256:current.fingerprint256});
          current=current.issuerCertificate;
        }
        finish({connected:true,authorized:socket.authorized,negotiatedVersion:socket.getProtocol(),cipher:socket.getCipher(),alpn:socket.alpnProtocol,
          subjectAlternativeNames:cert.subjectaltname,daysUntilExpiry:Math.floor((Date.parse(cert.valid_to)-Date.now())/86400000),chain});
      });
      socket.once('error',error=>finish({connected:false,error:error.code||error.name,detail:error.message}));
    } catch(error) {finish({connected:false,error:error.code||error.name,detail:error.message});}
  });
}

(async()=>{
  const checks=[];
  for(const hostname of ['mcshekinah.org','www.mcshekinah.org']) {
    for(const version of ['TLSv1.2','TLSv1.3'])checks.push(await handshake(hostname,version));
  }
  for(const version of ['TLSv1','TLSv1.1'])checks.push(await handshake('mcshekinah.org',version));
  const httpRedirects=[];
  for(const hostname of ['mcshekinah.org','www.mcshekinah.org'])httpRedirects.push(await httpsRedirect(hostname));
  const modern=checks.filter(c=>['TLSv1.2','TLSv1.3'].includes(c.requestedVersion));
  const legacy=checks.filter(c=>['TLSv1','TLSv1.1'].includes(c.requestedVersion));
  const legacyRejected=legacy.every(c=>!c.connected&&c.error==='ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION');
  const findings=[];
  if(modern.some(c=>!c.connected||!c.authorized))findings.push('A modern TLS handshake or public certificate validation failed; inspect the recorded error.');
  if(legacy.some(c=>c.connected))findings.push('The public endpoint accepted an obsolete TLS version.');
  else if(!legacyRejected)findings.push('Legacy rejection was inconclusive: a client or network failure is not proof of server policy.');
  if(modern.some(c=>c.connected&&c.daysUntilExpiry<14))findings.push('A certificate expires in fewer than 14 days; check renewal status.');
  if(httpRedirects.some(result=>!result.verified))findings.push('An HTTP-to-HTTPS redirect could not be verified. A network/client error is inconclusive about the origin redirect policy.');
  const report={checkedAt:new Date().toISOString(),node:process.version,openssl:process.versions.openssl,
    mode:'Direct TLS using bundled public roots, SNI and normal hostname/expiry validation; six serial handshakes and two HTTP redirect requests',
    modernValidated:modern.every(c=>c.connected&&c.authorized),legacyRejected,httpsRedirectsVerified:httpRedirects.every(result=>result.verified),checks,httpRedirects,findings,
    limitations:['Observed endpoint and negotiated ciphers only; no exhaustive cipher, revocation, OCSP, or global-edge assessment.']};
  const output=path.resolve('security/local-results/live-transport.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(!report.modernValidated||!legacyRejected||!report.httpsRedirectsVerified)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
