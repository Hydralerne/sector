"""Dependency-free Firefox Marionette smoke test. Isolated local profile only."""
import socket,json,time,subprocess,base64,pathlib
root=pathlib.Path(__file__).resolve().parent
log=open(root/'qa-browser.log','w')
proc=subprocess.Popen(['/Applications/Firefox.app/Contents/MacOS/firefox','--headless','--no-remote','--marionette','--profile',str(root/'.firefox-upgrade')],stdout=log,stderr=log)
sock=None
try:
    for _ in range(80):
        try:sock=socket.create_connection(('127.0.0.1',2830),timeout=1);break
        except OSError:time.sleep(.25)
    if sock is None:raise RuntimeError('Firefox Marionette did not become ready')
    sock.settimeout(25)
    def read():
        length=b''
        while True:
            c=sock.recv(1)
            if c==b':':break
            if not c:raise RuntimeError('Browser closed socket')
            length+=c
        size=int(length);data=b''
        while len(data)<size:data+=sock.recv(size-len(data))
        return json.loads(data)
    print('Firefox handshake:',read(),flush=True)
    i=0
    def call(name,params={}):
        global i
        i+=1;data=json.dumps([0,i,name,params]).encode();sock.sendall(str(len(data)).encode()+b':'+data)
        while True:
            reply=read()
            if reply[0]==1 and reply[1]==i:
                if reply[2]:raise RuntimeError(reply[2])
                return reply[3]
    call('WebDriver:NewSession',{'capabilities':{'alwaysMatch':{'acceptInsecureCerts':True}}})
    call('WebDriver:SetWindowRect',{'width':1440,'height':1000})
    call('WebDriver:Navigate',{'url':'http://127.0.0.1:3000/'})
    time.sleep(2)
    def js(script):return call('WebDriver:ExecuteScript',{'script':script,'args':[],'newSandbox':False})
    info=js('return {title:document.title,disabled:document.querySelector("#start").disabled,message:document.querySelector("#message").textContent,webgl:!!document.querySelector("#view").getContext("webgl"),size:[innerWidth,innerHeight]};')
    print('Initial browser state:',info,flush=True)
    shot=call('WebDriver:TakeScreenshot',{'full':False});(root/'preview-upgrade.png').write_bytes(base64.b64decode(shot['value']))
    if info['value']['disabled']:raise RuntimeError('WebGL initialization failed')
    # Denied synthetic pointer lock should still permit keyboard fallback.
    js('document.querySelector("#start").click();return true;')
    time.sleep(2)
    print('Started HUD:',js('return {overlay:document.querySelector("#overlay").style.display,hp:document.querySelector("#hp").textContent,timer:document.querySelector("#timer").textContent,threat:document.querySelector("#threat").textContent};'),flush=True)
    shot=call('WebDriver:TakeScreenshot',{'full':False});(root/'preview-gameplay.png').write_bytes(base64.b64decode(shot['value']))
    js('document.querySelector("#pause").click();return true;')
    paused=js('return document.querySelector("#timer").textContent;');time.sleep(1.2)
    assert paused==js('return document.querySelector("#timer").textContent;'),'paused clock advanced'
    assert js('return document.querySelector("#overlay").style.display;')['value']=='flex'
    print('Browser start, rendered frames, pause freeze: PASS',flush=True)
finally:
    if sock:sock.close()
    proc.terminate()
    try:proc.wait(timeout=5)
    except subprocess.TimeoutExpired:proc.kill();proc.wait()
    log.close()
