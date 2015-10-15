//INFO: quickly prototype/deploy apps using phonegap & loading from url/sdcard
logIn=false;
enAppMovil= true;
GLOBAL= this.GLOBAL || this;
CfgUser= GLOBAL.CfgUser || "XxxUser";
CfgPass= GLOBAL.CfgPass || "XxxPass";
var offLine =false;
//var c

//S: base
function ensureInit(k,v,scope) { //D: ensure k exists in scope initializing with "v" if it didn't
 if (!(k in scope)) { scope[k]= v; }
 return scope[k];
}
CFGLIB= ensureInit("CFGLIB",{},this);

function str(x) {
 var r;
 try { r= JSON.stringify(x); }
 catch (ex) { //A: json fails, must be circular
  var t= typeof(x)
  r="str_r('"+typeof(x)+"',{";
  for (var i in x) { r+="'"+i+"': '"+x[i]+"', " }
  r+="});"
 }
 return r;
}

function evalm(src,failSilently) {
 console.log("ESTOY EN EVALM ");
 logm("DBG",9,"EVALM",src);
 var r;
 try { r = window.eval(src); logm("DBG",9,"EVALM",[r,src]); }
 catch (ex) {
  console.log("ERROR EN EVALM " + src);
  logm("ERR",failSilently ? 9 : 0,"EVALM",[ex.message,src]);
  if (!failSilently) { throw(ex); }
 }
 return r;
}

function strToBin(d) {
  var dataBuf = new ArrayBuffer(d.length);
  var dataView = new Int8Array(dataBuf);
  for (var i=0; i < d.length; i++) { dataView[i] = d.charCodeAt(i) & 0xff; }
 return dataBuf;
}

//S: log
CFGLIB.loglvlmax=9;
function logm(t,l,msg,o) {
 if (l<=CFGLIB.loglvlmax) {
  alert(["LOG",t,l,msg,str(o)].join(":"));
 }
}

//S: defaults
function onFail(d) { logm("ERR",1,"ON FAIL",d); }
function nullf() {}

//S: files
function getFile(path,fmt,cbok,cbfail) {
    cbfail=cbfail ||onFail;
    function read(file) {
         var reader = new FileReader();
         reader.onloadend = function(evt) {
                logm("DBG",8,"getFile onloadend",{path: path, result: evt.target.result});
                cbok(evt.target.result);
         };
         if (fmt=="url") { reader.readAsDataURL(file); }
         else if (fmt=="bin") { reader.readAsBinaryString(file); }
         else if (fmt=="array") { reader.readAsArrayBuffer(file); }
         else { reader.readAsText(file); }
    };

    var onGotFile= function (file) { read(file); }

    var onGotFileEntry= function (fileEntry) { fileEntry.file(onGotFile,cbfail); }

    var onGotFs= function (fileSystem) {
     fileSystem.root.getFile(path, {create: false}, onGotFileEntry, cbfail);
    }

    logm("DBG",8,"getFile",{path: path});
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onGotFs, cbfail);
}

function getFileMeta(path,cbok,cbfail) {
 cbfail=cbfail ||onFail;
 var onGotFileEntry= function (fileEntry) { fileEntry.getMetadata(cbok,cbfail); }
 var onGotFs= function (fileSystem) {
  fileSystem.root.getFile(path, {create: false}, onGotFileEntry, cbfail);
 }
 logm("DBG",8,"getFile",{path: path});
 window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onGotFs, cbfail);
}

function keysFile(dirPath,cb) {
 window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fsSuccess, onFail);

 function fsSuccess(fs) {
  logm("DBG",9,"keysFile gotfs",[dirPath,fs.root]); try {
   //A: hago backup de la variable fs.root.fullPath, porque sino se pisa y crea carpetas pm donde no debería
   var bkp = fs.root.fullPath;

   if (dirPath) { fs.root.fullPath= dirPath; } //A: cd //XXX: NO usar O restaurar, PERSISTE PARA OTRAS LLAMADAS!!!
   var directoryReader = fs.root.createReader();
   directoryReader.readEntries(cb,cb);

   //A:restauro variable fs.root.fullPath con el valor que tenía originalmente
   fs.root.fullPath = bkp;
  } catch (ex) { logm("ERR",7,"keysFile gotfs",[dirPath,ex.message]); }
 }
}

function setFile(path,data,cbok,cbfail) {
 cbfail=cbfail || onFail;

  window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, onFail);

  function gotFS(fileSystem) {
  logm("DBG",9,"setFile gotfs",[path]); try {
  fileSystem.root.getFile(path, {create: true, exclusive: false}, gotFileEntry, cbfail);
  } catch (ex) { logm("ERR",7,"setFile gotfs",[path,ex.message]); }
 }

  function gotFileEntry(fileEntry) {
  logm("DBG",9,"setFile gotentry",[path]); try {
  fileEntry.createWriter(gotFileWriter, cbfail);
  } catch (ex) { logm("ERR",7,"setFile gotentry",[path,ex.message]); }
  }

  function gotFileWriter(writer) {
  logm("DBG",9,"setFile write",[path]); try {
   writer.onwriteend = function(evt) {
     writer.onwriteend = cbok;
     writer.write(data);
   };
   writer.truncate(0);
  } catch (ex) { logm("ERR",7,"setFile write",[path,ex.message]); }
  }
}

function setFileBin(path,data,cbok,cbfail) { setFile(path,strToBin(data),cbok,cbfail); }

function setFileDir(path,cbok,cbfail) {
 cbfail=cbfail ||onFail;
 var parts= path.split("/");
 var i= 0;

 window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onRequestFileSystemSuccess, cbfail);

 function onRequestFileSystemSuccess(fileSystem) {
  if (parts.length==0) { cbok(fileSystem.root); }
  else {	createPart(fileSystem.root) }
 }

 function createPart(pdir) {
  var p= parts[i]; i++;
 pdir.getDirectory(p, {create: true, exclusive: false}, i<parts.length ? createPart : cbok,cbfail);
 }
}

borrarTodo_dir= function (dirPath,quiereSinPedirConfirmacion,cb) {
 var gotDir= function (dirEntry) { try { ///XXX: separar de UI
  var uc= quiereSinPedirConfirmacion ? "s" : prompt("esta seguro que desea eliminar '"+dirEntry.name+"'?");
  if (uc=="s") {
   dirEntry.removeRecursively(function () { quiereSinPedirConfirmacion || alert('los archivos han sido eliminados'); cb(); },onFail);
  }
  else {
   alert("NO se eliminaran los archivos");
  }
 } catch (ex) { logm("ERR",7,"borrarTodo_dir cuandoTengaDir",[dirPath,ex.message]); }}

 var gotFs= function (fs) { try {
  logm("DBG",7,"borrarTodo_dir fs "+dirPath+" vs "+fs.root.fullPath);
  fs.root.fullPath="";
  fs.root.getDirectory(dirPath,{create: false}, gotDir,onFailAlert);
 } catch (ex) { logm("ERR",1,"borrarTodo_dir fs",[dirPath,ex.message]); }}

 window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFs, onFail);
}

//S: http
function getHttp(url,reqdata,cbok,cbfail) {
 console.log("EN getHTTP " +url+" "+reqdata);
 cbfail=cbfail || onFail;
 logm("DBG",8,"getHttp",{url: url, req: reqdata});

 var userPass= Cfg.User + ":" + Cfg.Pass + ":" + "movil";
 $.ajax({ url: url, data: reqdata,
  cache: false,
  dataType: 'text', //A: don't eval or process data
  headers: { "Authorization": "Basic " + btoa(userPass ) },
  beforeSend: function (jqXHR, settings) { //A: for binary downloads
   jqXHR.overrideMimeType('text/plain; charset=x-user-defined');
 },
  success: function(resdata){
   logm("DBG",8,"getHttp",{url: url, len: reqdata.length, req: reqdata, res: resdata});
   logIn =true;
   cbok(resdata);
  },
  error: function (){

     Cfg.online = false;
    //error al conectarse
    if (!offLine){
      offLine = true;
      if(!logIn){
          var cfgPath  = CFGLIB.pathToLib.substring(0,CFGLIB.pathToLib.indexOf("/"))+"/cfg";
          getFile(cfgPath, "txt",function (result){
                var src=encriptar_fromSVR_r(result,SRC_KEY);
              //creo que no anda por que tiene src_key
               var jsonCfg = JSON.parse(src);
              if(Cfg.User==jsonCfg.user){
                  if(Cfg.Pass==jsonCfg.pass){

                    logIn=true;
                    alert (" No se pudo conectar a: " + url + " .Intentando Recuperar datos locales..." );
                    cbfail(reqdata);

                  }else
                   {
                     alert("La combinación de usuario y contraseña es incorrecta.");
                   }
              }
               else{
                   alert("La combinación de usuario y contraseña es incorrecta.");
               }

                 if(!logIn){
                  //LibAppStarted=false;
                  rtInit();
                 }

           },function (){
            //puede ser que no tenga el cfg
            alert("Error al querer Iniciar sesion. Para ingresar por primera vez debe estar conectado a la red. ");
           })

      }
    }else{
      if(logIn){
        cbfail(reqdata);
      }else{
         LibAppStarted= false;
         rtInit();  //vuelve al principio
      }
    }
     //cbfail(reqdata);
    }
 });
}

CFGLIB.pathToLib="pm/pg/";
CFGLIB.pathDfltInLib="a/";

function evalFile(name,failSilently,cbok,cbfail) {
 console.log("EVAL FILE de " + name);
 getFile(CFGLIB.pathToLib+name,"txt",function (srce) {
      try {
          var src= encriptar_r(srce,SRC_KEY);
          var r= evalm(src+' //# sourceURL='+name,failSilently);
          cbok(r);
      } catch (ex) {
         logm("ERR",1,"evalFile "+str(ex)); }
    },
 cbfail); // si no existe tiene que ir al fail
}

function evalFileOrDflt(name,failSilently,cbok,cbfail) {
 var s0= function () { evalFile(name,failSilently,cbok,s1f); }
 var s1f= function () { console.log("EN S1F AAAA  eval de : " +CFGLIB.pathDfltInLib+name);evalFile(CFGLIB.pathDfltInLib+name,failSilently,cbok,cbfail); }
 s0();
}

function getHttpToDflt(fname,url,cbok,cbfail) {
 console.log("EN GETHTTPTODLF " + fname +" URL   "+url);
 getHttp(url,{},function (d) {
    try {
          var de= encriptar(d,SRC_KEY);
          setFile(CFGLIB.pathToLib+CFGLIB.pathDfltInLib+fname,de,cbok,cbok);
    } catch (ex) {
          logm("ERR",1,"getHttpToDflt setFile "+str(ex))
    }
  }, cbfail);
}

function evalUpdated(name,cbok,cbfail) {
 var s0= function () { getHttpToDflt(name,CFGLIB.cfgurl+name,s1,s1); }
 var s1= function () { evalFileOrDflt(name,false,cbok,cbfail); }
 s0();
}

//S: Borrar archivos
function removeFile(path, cbok, cbfail){
    console.log("remove file");
    var relativeFilePath = path;
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem){
        fileSystem.root.getFile(relativeFilePath, {create:false}, function(fileEntry){
            fileEntry.remove(function(file){
                console.log("File removed!");
            },function(){
                console.log("error deleting the file " + error.code);
                });
            },function(){
                console.log("file does not exist");
            });
        },function(evt){
            console.log(evt.target.error.code);
    });
}

//S: Lee archivo local almacenada en particular sin la funcionalidad de caché
function readLocalFile(path,params,cbok,cbfail) {
    
    getFile(path, "txt",
            function(result) {cbok(result);},
            function(err) {
                logm("DBG", 1, "syncSubirCadaNota - getFile Error, no trae nota - Err:", err);
                cbfail(params);
               }
          );
}

//S: init
CFG_APPURL_DFLT= 'https://192.168.184.187:8443/app';
CFGLIB.appUrl= CFG_APPURL_DFLT;
SRC_KEY= "18273hjsjacjhq83qq3dhsjdhdy38znddj";
function runApp() { //XXX:generalizar usando evalUpdated
 console.log("RUN APP "+CFGLIB.appUrl);
 logm("DBG",1,"RUN APP "+ser_json(Cfg)+" "+ser_json(CFGLIB));
 var s0= function () {
    getHttpToDflt('app.js',CFGLIB.appUrl,s1,s1);
   }

 var s1= function () {
   evalFile(CFGLIB.pathDfltInLib+'app.js',false,nullf,function (err) {

        if(offLine){
          //por que no hay nada guardado no se encontraron los datos.
          alert("No se encontraron datos locales. No se puede ingresar sin conexión a la red");
        }else{
          alert("Error iniciando paso 2, ingresó los datos correctos? ("+str(err)+")");
        }
        LibAppStarted= false;
        rtInit();  //vuelve al principio
      }
     );
  }

 setFileDir(CFGLIB.pathToLib+CFGLIB.pathDfltInLib,s0,onFailAlert);
}

ensureInit("LibAppStarted",false,this);
ensureInit("Cfg",false,this);
function rtInit() {
 offLine=false;
 logIn =false;
 if (LibAppStarted)
  { return true; }
 LibAppStarted= true;
 CFGLIB.loglvlmax=0;
 //D: pantalla inicial ofreciendo Run, Run con debug (alerts) y bajarse la app
 var con= $('#con');
 con.html('');
 var form= $('<div style="font-size: 2em; text-align: center;"/>');
 con.append(form);
 var iusr=$('<input placeholder="usuario" value="testParqueChas">');
 var ipass=$('<input  type="password" placeholder="clave" value="asd123">');
 var iversion=$('<input placeholder="version" value="::https://10.70.251.40:8444/app">');
 var bgo=$('<button>Iniciar</buton>');
 var bgx=$('<button>Salir</buton>');
 var bgc=$('<a href="#">(borrar datos locales)</a>');
 form.append(iusr).append("<br><br>");
 form.append(ipass).append("<br><br>");
 form.append(iversion).append("<br><br><br>");
 form.append(bgo).append("<br><br>");
 form.append(bgx).append("<br><br><br>");
 form.append(bgc);

 bgo.off('click').on('click',function () { try {
  alert("Iniciando");
  CFGLIB.appUrl= CFG_APPURL_DFLT;
  CFGLIB.loglvlmax= 0;
  Cfg={};
  Cfg.User= iusr.val(); Cfg.Pass= ipass.val(); var iv= Cfg.VersionStr= iversion.val();

  var m= /([^:]*):?([^:]*):?(\S*)/.exec(iv);
  if (m[3]) { CFGLIB.appUrl= m[3]+'/js' }
  var md;
  if (md= /d(\d?)/.exec(m[2])) { CFGLIB.loglvlmax= parseInt(md[1])||9; }
  CFGLIB.appUrl+= m[1];
  //XXX:SEC: cambiar PathToLib segun version para que no se pueda bajar una version de un host y acceder a los datos de otra? relacion con encriptar datos bajados?
  //alert("Cfg "+ser_json(CFGLIB));
  runApp(); //XXX: que hacemos si no se pudo iniciar app? hay que volver aca :)
 } catch (ex) { alert("ERROR "+ex.message+" "+str(ex)) } });

 bgx.off('click').on('click',function () { navigator.app.exitApp(); })
 bgc.off('click').on('click',function () { borrarTodo_dir(CFGLIB.pathToLib,true,function () { alert("Los archivos locales han sido eliminados"); }); });
}
document.addEventListener("deviceready", rtInit, false);

