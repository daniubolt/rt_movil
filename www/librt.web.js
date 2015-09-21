CACHE_LOCALSTORAGE= true;
DBG_DATA= true;

GLOBAL= this.GLOBAL || this;
GLOBAL.DBG= GLOBAL.DBG || {};
DBG.run= false;

//****************************************************************************
//S: UTIL/base, XXX:mover a librt!
//XXX:logm si no existe...
enAppMovil= enAppMovil || window.CFGLIB!=null;

dbgUi= function (quiereOn) {
    if (quiereOn) { if (enAppMovil) { CFGLIB.loglvlmax= 5; alertNative= alertNative || alert;
        alert= function (m) { m.match(/:ERR:/) ? xalert(m) : showMsg(m); }
    } }
    else { if (enAppMovil) { CFGLIB.loglvlmax= 1; } }
}

window.onerror = function myErrorHandler(errorMsg,url,lineNumber,col,error) {
    if (typeof(errorMsg)=="object") { //A: es un evento, ej. en phonegap
        var e= errorMsg; errorMsg= str(e);
    }
    alert("ERROR [g] "+errorMsg+" "+url+" "+lineNumber+" "+ error);
}

function showMsg(msg) { alert(msg); }  //XXX: Cambiar por una función con el estilo de la UI
function raiseError(msg) { showMsg(msg); }   //XXX: Cambiar por una función que guarde en el log y muestre un cartel (¿Usar Log de lib.js?)
function fnop() {}; //D: NOP

toJs= function (v) { return v; } //D: compatibilidad con rt_java
logm= GLOBAL.logm || function(t,lvl,msg,o) { //D: usar SOLO esta funcion de log (t es DBG, NFO o ERR ; lvl es 0 para importantisimo y 9 para irrelevante, o es un objeto que se serializa (ej. diccionario)
    console.log("LOG:"+t+":"+lvl+":"+msg+":"+(o ? ser_json(o) : ""));
}

//****************************************************************************
//S: UTIL/LOAD/MODULES
var Cache= { LibEval: {} };
var LibWaiting= {};
function libRequire(file,urlBase,url,cb) { //D: load js modules, call BEFORE using, asume async loading -> call dependent code from libStart that is always called AFTER loading all previously required modules
console.log("LIBREQUIRE");
    url= url || (urlBase+file);
    var needsEval= true;
    function processData(response) {
        var d;
        var raw = response ? ((typeof(response)=="string") ? response :response.responseText) : "";
        DBG.run && alert("DBG libRequire loaded file='"+file+"' from url='"+url+"'");
        Cache.LibEval[url]= raw || ""; //XXX: cache handling
        if (needsEval) {
            try { d= eval(raw); }
            catch (ex) { alert("[LRQ] Error evaluando file='"+file+"' "+ex.message+" "+ex.fileName+" "+ex.lineNumber); }
        }
        if (cb) { cb(d,raw,url); }
        delete LibWaiting[url]; //A: checked in a setTimeout loop
        DBG.run && alert("DBG libRequire DONE file='"+file+"' from url='"+url+"'");
    }

    LibWaiting[url]= url;
    if (Cache.LibEval[url])
    {
        processData(Cache.LibEval[url])
    }
    else {
            if (enAppMovil) { //A: mobile, para que funcione offline Y online
                DBG.run && alert("DBG:libRequire load with app");
              var s0= function () { DBG.run && alert("DBG:libRequire getHttpOrDflt file='"+file+"' url='"+url+"'");
                    getHttpToDflt(file,url,s1,s1);
                }
              var s1= function () { DBG.run && alert("DBG:libRequire evalFileOrDflt file='"+file+"' url='"+url+"'");
                    evalFileOrDflt(file,false,processData);
                    setTimeout(processData,1000); //XXX:FIX in mobile app, callback is not being called :P
                };
                needsEval= false;
              s0();
            }
            else if (window.location.protocol=="file:") {
                DBG.run && alert("DBG:libRequire load with script");
                var es= document.createElement("script");
                es.onload= function () { processData(es.innerHTML+"");};
                es.setAttribute("id",url);
                es.setAttribute("src",url);
                document.body.appendChild(es);
            }
            else {
                DBG.run && alert("DBG:libRequire load with ajax");
                $.ajax({
                    url: url,
                    crossDomain: true,
                    cache: false,
                    method: 'GET',
                    params: {},
                    success: processData,
                    failure: function (response, opts) {
                        alert("ERROR: [LRW] libRequire file='"+file+"' "+response.responseText);
                        if (cb) { cb(); }
                    }
                });
            }
    }
    //XXX: handle error!
    //XXX: ¿Si se quedó sin memoria? ¿Ofrecer borrar una zona?
}

var LibStartChk;
function libStart(cb,msg) { //D: call start function after all libRequire have been satisfied
    LibStartChk= (new Date()).getMilliseconds()+10000;
    if (Object.keys(LibWaiting).length==0) { //A: no hay pendientes para cargar
        showMsg("[RS] "+(msg || "Listo, iniciando!"));
        if (cb) { try { cb(); } catch (ex) { alert("[RS] ERROR iniciando "+ex.message+" "+ex.stack); } }
    }
    else { //A: todavia esperamos algun require
        console.log("DBG libStart waiting for "+Object.keys(LibWaiting));
        setTimeout(function () { libStart(cb); },200 );
        if ((new Date()).getMilliseconds()>LibStartChk) {
            alert("ERROR [RW] no puedo cargar "+Object.keys(LibWaiting));
            LibStartChk= (new Date()).getMilliseconds()+10000;
        }
        //A: probamos de nuevo en 200ms
    }
}


toJs= function (v) { return v; } //D: compatibilidad con rt_java

truncate= function (num,decs) {
    var x= Math.pow(10,decs);
    return Math.floor(num*x)/x;
}

logm= GLOBAL.logm || function(t,lvl,msg,o) { //D: usar SOLO esta funcion de log (t es DBG, NFO o ERR ; lvl es 0 para importantisimo y 9 para irrelevante, o es un objeto que se serializa (ej. diccionario)
    console.log("LOG:"+t+":"+lvl+":"+msg+":"+(o ? ser_json(o) : ""));
}

logmAndThrow= function (t,lvl,msg,o) {
    logm(t,lvl,msg,o);
    throw({message: msg, data: o});
}

logmex= function(t,lvl,msg,o,ex) {
    var es= (typeof(ex)=="string" && ex) || (ex.message && (ex.message + (ex.data ? (" "+ser_json(ex.data)) : "")) || ex.getMessage()|| "").replace(/\r?\n/g," ");
    if (ex.stack) { es+= " "+ex.stack.replace(/\r?\n/g," > ");}
    else {
        if (ex.fileName) { es+= " "+ex.fileName;}
        if (ex.lineNumber) { es+= ":"+ex.lineNuber;}
    }
    logm(t,lvl,msg+" EXCEPTION "+es,o);
}

onFailAlert= function (err) { alert("ERROR: "+str(err)); }

ser_json= function (o,wantsPretty) {
    var s;
    if (o!=null) {
        try { s= JSON.stringify(o,null,wantsPretty ? 2 : null); }
        catch (ex) { s=o+""; }
    }
    else {
        s="null";
    }
    return s;
}

ser_json_r= function (s) {
    try {
        return JSON.parse(s);
    }
    catch (ex) {
        logmex("ERR",5,"SER PARSE JSON",s,ex);
        throw(ex);
    }
}

ser= ser_json; //DFLT

ser_planoOproto= function (ox,serFun,wantsPretty) { //U: para NO encodear strings, usa el primer caracter para distinguir
    var o= toJs(ox)
    return ((typeof(o)=="string") ? ("\t"+o) : (" "+serFun(o,wantsPretty)));
}

ser_planoOproto_r= function (s,serFun_r) {
    return (s && s.length>0) ?
        s.charAt(0)=="\t" ? s.substr(1) : serFun_r(s.substr(1)) :
        null;
}

ser_planoOjson= function (o, wantsPretty) { return ser_planoOproto(o,ser_json,wantsPretty); }
ser_planoOjson_r= function (s) { return ser_planoOproto_r(s,ser_json_r); }


load= function (l) { console.log("REVISAR QUE "+l+" ESTE CARGADO") };

cxAjax= function (cmd,args,pipe,cb) {
    pipe= pipe || 'Json';
    req= args; req.cmd= cmd;
    console.log("LOG:DBG:1:CX cxAjaxSync "+req);
    var r= null;
    $.ajax({
        type: 'GET',
        url: '/app/cx',
        data: { pipe: pipe, json: JSON.stringify(req) },
        dataType: 'text',
        timeout: 300000,
        async: cb!=null,
        success: function(data){
            DBG_DATA && console.log("DATA: "+data);
            r= data;
            cb && cb(pipe=='Json' ? JSON.parse(data) : data);
        },
        error: function(xhr, status, error){ showMsg('Ajax error!' + status + " "+xhr.responseText+ " "+JSON.stringify(req) ) }
    });
    return pipe=='Json' ? JSON.parse(r) : r;
}

//XXX: estas pueden ir en lib.js
promedio= function (v0,v1) { return v0+(v1-v0)/2; }
clonar= function (o) { var r= {}; for (var k in o) { r[k]= o[k] }; return r; }

CfgDbKey = GLOBAL.CfgDbKey || '3sUns3Cr3t0!';
encriptar= function (data,key) { try {
     var datae= sjcl.encrypt(key || CfgDbKey,btoa(encodeURIComponent(ser_planoOjson(data))));
    return datae;
} catch(ex) { logmex("ERR",1,"ENCRIPTAR",data,ex); throw(ex) } }

encriptar_r= function (data,key) { try {
     return ser_planoOjson_r(decodeURIComponent(atob(sjcl.decrypt(key || CfgDbKey,data))));
} catch(ex) { logmex("ERR",1,"ENCRIPTAR R",data,ex); throw(ex) } }


gkey1=function(r){for(var n="",e="edoCrahC",t="morf",i="sba",o=0;o<r.length;o++){for(var u=function(){return r.charCodeAt(o)},a=!0,f=2;f<u();f++){var v=function(){return u()%f===0}
v()&&(a=!1)}if(a){var c=function(){var r=function(){return u()%o}
return r()}
n+=c()}else{var s=function(){var r=3*u()
return(r>126||32>r)&&(r=Math[i.split("").reverse().join("")](r)-32+32),r},l=function(){return String[t.split("").reverse().join("")+e.split("").reverse().join("")](s())}
n+=l()}}return n}




encriptar_fromSVR_r = function(data, key) {
    try {
        var zkey = key || CfgDbKey;
        var xkey = gkey1(zkey);
        console.log("ENCK D " + zkey + " > " + xkey);
        return ser_planoOjson_r(decodeURIComponent(atob(sjcl.decrypt(xkey, data))));
    } catch (ex) {
        logmex("ERR", 1, "ENCRIPTAR R", data, ex);
        throw (ex)
    }
}



runBg= L.Util.requestAnimFrame;

funcionConCache_a_archivos= function (nombre,funcion,cbIdx,funcionClavePara,cacheCntMax,prefijoNombreArchivo) { //D: envuelve una funcion con cache, si esta en movil usa archivos encriptados para cuando este offline
    prefijoNombreArchivo= prefijoNombreArchivo || "";
    var cache= nuevo_cache_recienUsados(nombre,cacheCntMax);
    var funcionConCacheArchivos= funcion; //A: DFLT
    if (!enAppMovil && CACHE_LOCALSTORAGE) {
        GLOBAL.CFGLIB={};
        GLOBAL.CFGLIB.pathToLib="Em_Map_";
        getFile= function (p,t,cbok,cbf) { var v= localStorage[p]; setTimeout(function () { v ? cbok(v) : cbf()},100); }
        setFile= function (p,v,cbok,cbf) { localStorage[p]= v; setTimeout(cbok,100); }
        setFileBin= function (p,v,cbok,cbf) { localStorage[p]= v; setTimeout(cbok,100); }
        setFileDir= function (p,cbok,cbf) { setTimeout(cbok,100); }
        borrarTodo_dir= function (p,quiereSinPedirConfirmacion,cb) {
            for (var i=0; i<localStorage.length; i++) { var k= localStorage.key(i);
                if (k.substr(0,p.length)==p) { localStorage.removeItem(k); }
            }
            setTimeout(cb,10);
        };

		removeTemporaryNoteFromLocalStorage = function(elementId, t, cbok, cbf) {
		for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
			var regex = new RegExp("note." + elementId);
			if (regex.test(k)) {
				logm("DBG", 1, "SE ELIMINO LA NOTA TEMPORARIA PARA EL elementId : " + elementId);
                localStorage.removeItem(k);
            }
        }
        setTimeout(cb, 10);
		};
		
		changeNoteInLocalStorage = function(elementId, newNote, t, cbok, cbf) {
			for (var i = 0; i < localStorage.length; i++) {
				var k = localStorage.key(i);
				var regex = new RegExp("\D*(note_5f)+.*(" + elementId + ")+");
				newNote_encriptado = encriptar([newNote]);
				if (regex.test(k)) {
					localStorage[k] = ser_planoOjson(newNote_encriptado);
					logm("DBG", 1, "NOTA MODIFICADA: " + JSON.stringify(newNote));
				}
			}
			setTimeout(cb, 10);
		};
    }
    if (enAppMovil || CACHE_LOCALSTORAGE) {
        var cacheArchivos= nuevo_cache_envuelto(nuevo_cache_archivosMovil(nombre+"_archivos",prefijoNombreArchivo),encriptar,encriptar_r);
        funcionConCacheArchivos= funcionConCache_a(funcion,cbIdx,cacheArchivos,funcionClavePara);
    }
    var funcionr= funcionConCache_a(funcionConCacheArchivos,cbIdx,cache,funcionClavePara);
    funcionr.cache= cache;
    funcionr.cacheArchivos= cacheArchivos;
    return funcionr;
}


rtInfo= function () { try {
    var s= "AV: "+navigator.appVersion;
    if (window.device) {
        s+= "\nD:"+device.uuid+" "+device.model+" "+device.platform+" "+device.version+" "+device.name;
    }
    else { s+= "\nD:noinfo"; }
    return s;
} catch(ex) { logmex("ERR",1,"RT INFO",null,ex)} }

//***************************************************************************
//S: UI
msgInit= function () {
    if (this.msgDiv_) { return; }
    msgDiv_= document.createElement("DIV");
    msgDiv_.style.position= "fixed";
    msgDiv_.style.top= "0px";
    msgDiv_.style.left= "0px";
    msgDiv_.style.width= "30em";
    msgDiv_.style.minHeight= "5em";
    msgDiv_.style.background= "black";
    msgDiv_.style.color= "red";
    msgDiv_.style.zIndex= 9999;
    msgDiv_.style.border= "1px dotted gray";
    msgDiv_.style.padding= "0.5em";
    msgDiv_.style.wordWrap= "break-word";
    msgDiv_.style.visibility= "hidden";
    msgDiv_.style.overflow= "scroll";
    document.body.appendChild(msgDiv_);
}

MsgSz= 500;
_msgTimeout= null;
showMsg= function (s) {
    msgInit();
    var s0= msgDiv_.innerHTML+s+"<br><br>";
    msgDiv_.innerHTML= s0.length > MsgSz ? s0.substr(s0.length-MsgSz) : s0;
    clearTimeout(_msgTimeout);
    _msgTimeout= setTimeout(function () { msgDiv_.style.visibility="hidden"; msgDiv_.innerHTML="" }, 5000);
    msgDiv_.style.visibility="visible";
}


var appHost= (enAppMovil && CFGLIB.appUrl) ? CFGLIB.appUrl.replace(/[^\/]+$/,"") : CFG_APPURL_DFLT;
//var appHost='https://192.168.10.4:8443/app/';
var host= location.host ? "//"+location.host+"/app/" : appHost; //XXX: hack for phonegap, move inside libRequire, implement differently in each runtime
DBG.run && alert("HOST '"+host+"'");

//if (document.body) { document.body.innerHTML="CARGANDO de "+appHost+"..."; } //XXX: generalzar, pantalla de inicio


