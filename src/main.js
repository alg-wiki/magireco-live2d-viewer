var thisRef = this;


window.onerror = function(msg, url, line, col, error) {
    var errmsg = "file:" + url + "<br>line:" + line + " " + msg;
    l2dError(errmsg);
}

function main()
{
    this.platform = window.navigator.platform.toLowerCase();
    
    this.live2DMgr = new LAppLive2DManager();

    this.isDrawStart = false;
    
    this.gl = null;
    this.canvas = null;
    
    this.dragMgr = null; /*new L2DTargetPoint();*/ 
    this.viewMatrix = null; /*new L2DViewMatrix();*/
    this.projMatrix = null; /*new L2DMatrix44()*/
    this.deviceToScreen = null; /*new L2DMatrix44();*/
    this.modelMatrix = null;
    
    this.drag = false; 
    this.oldLen = 0;    
    
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    this.isModelShown = false;

    this.hold = false;

    this.charData = CharData;

    this.voiceData = {};
    
    initModelSelection(this.charData[86]);
    initL2dCanvas("glcanvas");
    
    init();
}

function initModelSelection(data)
{
    for (var key in data.SKIN){
        var opt = document.createElement("option");
        opt.text = key;
        opt.value = data.ID+""+data.SKIN[key];
        document.getElementById("select_model").appendChild(opt);
    }
}

function chg_model()
{
    changeModel();
}

function initL2dCanvas(canvasId)
{
    
    this.canvas = document.getElementById(canvasId);
    
    
    if(this.canvas.addEventListener) {
        this.canvas.addEventListener("mousewheel", mouseEvent, false);
        this.canvas.addEventListener("click", mouseEvent, false);
        
        this.canvas.addEventListener("mousedown", mouseEvent, false);
        this.canvas.addEventListener("mousemove", mouseEvent, false);
        
        this.canvas.addEventListener("mouseup", mouseEvent, false);
        this.canvas.addEventListener("mouseout", mouseEvent, false);
        this.canvas.addEventListener("contextmenu", mouseEvent, false);
        
        
        this.canvas.addEventListener("touchstart", touchEvent, false);
        this.canvas.addEventListener("touchend", touchEvent, false);
        this.canvas.addEventListener("touchmove", touchEvent, false);
        
    }

    document.getElementById("btnReset").addEventListener("click", function(e) {
        init();
    }, false);
    document.getElementById("btnBg").addEventListener("click", function(e) {
        initBgSelector();
    }, false);
    $("#btnCharacter").click(() => { loadCharList() });
    $("#select_motion").change(() => {
        thisRef.live2DMgr.changeMotion($("#select_motion").val());
    });
    window.onresize = (event) => {
        if (event === void 0) { event = null; }
        if (document.getElementById("darken") != null){
            document.getElementById("darken").top = window.pageYOffset + "px";
            document.getElementById("selector").top = (window.pageYOffset + (window.innerHeight * 0.05)) + "px";
        }
    };
       
}


function init()
{    
    
    var width = this.canvas.width;
    var height = this.canvas.height;
    
    this.dragMgr = new L2DTargetPoint();

    
    var ratio = height / width;
    var left = LAppDefine.VIEW_LOGICAL_LEFT;
    var right = LAppDefine.VIEW_LOGICAL_RIGHT;
    var bottom = -ratio;
    var top = ratio;

    this.viewMatrix = new L2DViewMatrix();

    
    this.viewMatrix.setScreenRect(left, right, bottom, top);
    
    
    this.viewMatrix.setMaxScreenRect(LAppDefine.VIEW_LOGICAL_MAX_LEFT,
                                     LAppDefine.VIEW_LOGICAL_MAX_RIGHT,
                                     LAppDefine.VIEW_LOGICAL_MAX_BOTTOM,
                                     LAppDefine.VIEW_LOGICAL_MAX_TOP); 

    this.viewMatrix.setMaxScale(LAppDefine.VIEW_MAX_SCALE);
    this.viewMatrix.setMinScale(LAppDefine.VIEW_MIN_SCALE);

    this.projMatrix = new L2DMatrix44();
    this.projMatrix.multScale(1, (width / height));

    this.modelMatrix = new L2DModelMatrix();
    this.modelMatrix.setPosition(LAppDefine.MODEL_POSITION_X, LAppDefine.MODEL_POSITION_Y);

    
    this.deviceToScreen = new L2DMatrix44();
    this.deviceToScreen.multTranslate(-width / 2.0, -height / 2.0);
    this.deviceToScreen.multScale(2 / width, -2 / width);
    
    
    
    this.gl = getWebGLContext();
    if (!this.gl) {
        l2dError("Failed to create WebGL context.");
        return;
    }
    
    Live2D.setGL(this.gl);

    
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);

    changeModel();
    
    startDraw();
    modelScaling(0.6, 0, 0);
}


function startDraw() {
    if(!this.isDrawStart) {
        this.isDrawStart = true;
        (function tick() {
                draw(); 

                var requestAnimationFrame = 
                    window.requestAnimationFrame || 
                    window.mozRequestAnimationFrame ||
                    window.webkitRequestAnimationFrame || 
                    window.msRequestAnimationFrame;

                
                requestAnimationFrame(tick ,this.canvas);   
        })();
    }
}


function draw()
{
    // l2dLog("--> draw()");

    MatrixStack.reset();
    MatrixStack.loadIdentity();
    
    this.dragMgr.update(); 
    this.live2DMgr.setDrag(this.dragMgr.getX(), this.dragMgr.getY());
    
    
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    MatrixStack.multMatrix(projMatrix.getArray());
    MatrixStack.multMatrix(viewMatrix.getArray());
    MatrixStack.multMatrix(modelMatrix.getArray());
    MatrixStack.push();
    
    for (var i = 0; i < this.live2DMgr.numModels(); i++)
    {
        var model = this.live2DMgr.getModel(i);

        if(model == null) return;
        
        if (model.initialized && !model.updating)
        {
            model.update();
            model.draw(this.gl);
            
            if (!this.isModelShown && i == this.live2DMgr.numModels()-1) {
                this.isModelShown = !this.isModelShown;
                document.getElementById("select_model").removeAttribute("disabled");
            }
        }
    }
    
    MatrixStack.pop();
}

function chg_expr() {
    this.live2DMgr.changeExpressionById(document.getElementById("select_expression").selectedIndex);
}

function changeModel()
{
    document.getElementById("select_model").setAttribute("disabled","disabled");
    $("#select_voice").prop("disabled", true);
    this.isModelShown = false;
    
    this.live2DMgr.reloadFlg = true;
    this.live2DMgr.count++;

    this.live2DMgr.changeModel(this.gl, document.getElementById("select_model").value);
    loadVoice($("#select_model").val());
}




function modelScaling(scale, x, y)
{   
    var isMaxScale = thisRef.viewMatrix.isMaxScale();
    var isMinScale = thisRef.viewMatrix.isMinScale();
    
    thisRef.viewMatrix.adjustScale(x, y, scale);

    
    if (!isMaxScale)
    {
        if (thisRef.viewMatrix.isMaxScale())
        {
            thisRef.live2DMgr.maxScaleEvent();
        }
    }
    
    if (!isMinScale)
    {
        if (thisRef.viewMatrix.isMinScale())
        {
            thisRef.live2DMgr.minScaleEvent();
        }
    }
}



function modelTurnHead(event)
{
    thisRef.drag = true;
    
    var rect = event.target.getBoundingClientRect();
    
    var sx = transformScreenX(event.clientX - rect.left);
    var sy = transformScreenY(event.clientY - rect.top);
    var vx = transformViewX(event.clientX - rect.left);
    var vy = transformViewY(event.clientY - rect.top);
    
    if (LAppDefine.DEBUG_MOUSE_LOG)
        l2dLog("onMouseDown device( x:" + event.clientX + " y:" + event.clientY + " ) view( x:" + vx + " y:" + vy + ")");

    thisRef.lastMouseX = sx;
    thisRef.lastMouseY = sy;

    thisRef.dragMgr.setPoint(vx, vy); 
    
    
    thisRef.live2DMgr.tapEvent(vx, vy);
}

function setHold(event)
{
    thisRef.hold = true;
    
    var rect = event.target.getBoundingClientRect();
    
    var sx = transformScreenX(event.clientX - rect.left);
    var sy = transformScreenY(event.clientY - rect.top);
    
    thisRef.lastMouseX = sx;
    thisRef.lastMouseY = sy;
}

function dragPosition(event)
{
    var rect = event.target.getBoundingClientRect();
    
    var sx = transformScreenX(event.clientX - rect.left);
    var sy = transformScreenY(event.clientY - rect.top);


    if (thisRef.hold){
        thisRef.modelMatrix.setPosition((sx - thisRef.lastMouseX) + thisRef.modelMatrix.tr[12], (sy - thisRef.lastMouseY) + thisRef.modelMatrix.tr[13]);

        thisRef.lastMouseX = sx;
        thisRef.lastMouseY = sy;
    }
}



function followPointer(event)
{    
    var rect = event.target.getBoundingClientRect();

    var sx = transformScreenX(event.clientX - rect.left);
    var sy = transformScreenY(event.clientY - rect.top);
    var vx = transformViewX(event.clientX - rect.left);
    var vy = transformViewY(event.clientY - rect.top);
    
    if (LAppDefine.DEBUG_MOUSE_LOG)
        l2dLog("onMouseMove device( x:" + event.clientX + " y:" + event.clientY + " ) view( x:" + vx + " y:" + vy + ")");

    if (thisRef.drag)
    {
        thisRef.lastMouseX = sx;
        thisRef.lastMouseY = sy;

        thisRef.dragMgr.setPoint(vx, vy); 
    }
}



function lookFront()
{   
    if (thisRef.drag)
    {
        thisRef.drag = false;
    }

    thisRef.dragMgr.setPoint(0, 0);
}


function mouseEvent(e)
{
    e.preventDefault();
    
    if (e.type == "mousewheel") {

        if (e.clientX < 0 || thisRef.canvas.clientWidth < e.clientX || 
        e.clientY < 0 || thisRef.canvas.clientHeight < e.clientY)
        {
            return;
        }
        
        if (e.wheelDelta > 0) modelScaling(1.1, 0, 0); 
        else modelScaling(0.9, 0, 0); 

        
    } else if (e.type == "mousedown") {

        
        if("button" in e && e.button == 2){
            setHold(e);
            return;
        }
        
        modelTurnHead(e);
        
    } else if (e.type == "mousemove") {
        
        dragPosition(e);

        followPointer(e);
        
    } else if (e.type == "mouseup") {
        
        
        if("button" in e && e.button == 2){
            if (thisRef.hold)
                thisRef.hold = false;
            return;
        }
        
        lookFront();
        
    } else if (e.type == "mouseout") {
        
        lookFront();
        
    } else if (e.type == "contextmenu") {
        
        //changeModel();
    }

}


function touchEvent(e)
{
    e.preventDefault();
    
    var touch = e.touches[0];
    
    if (e.type == "touchstart") {
        if (e.touches.length == 1) modelTurnHead(touch);
        // onClick(touch);
        
    } else if (e.type == "touchmove") {
        followPointer(touch);
        
        if (e.touches.length == 2) {
            var touch1 = e.touches[0];
            var touch2 = e.touches[1];
            
            var len = Math.pow(touch1.pageX - touch2.pageX, 2) + Math.pow(touch1.pageY - touch2.pageY, 2);
            if (thisRef.oldLen - len < 0) modelScaling(1.025, 0, 0); 
            else modelScaling(0.975, 0, 0); 
            
            thisRef.oldLen = len;
        }
        
    } else if (e.type == "touchend") {
        lookFront();
    }
}




function transformViewX(deviceX)
{
    var screenX = this.deviceToScreen.transformX(deviceX); 
    return viewMatrix.invertTransformX(screenX); 
}


function transformViewY(deviceY)
{
    var screenY = this.deviceToScreen.transformY(deviceY); 
    return viewMatrix.invertTransformY(screenY); 
}


function transformScreenX(deviceX)
{
    return this.deviceToScreen.transformX(deviceX);
}


function transformScreenY(deviceY)
{
    return this.deviceToScreen.transformY(deviceY);
}



function getWebGLContext()
{
    var NAMES = [ "webgl" , "experimental-webgl" , "webkit-3d" , "moz-webgl"];

    for( var i = 0; i < NAMES.length; i++ ){
        try{
            var ctx = this.canvas.getContext(NAMES[i], {premultipliedAlpha : true});
            if(ctx) return ctx;
        }
        catch(e){}
    }
    return null;
};



function l2dLog(msg) {
    if(!LAppDefine.DEBUG_LOG) return;
    
    var myconsole = document.getElementById("myconsole");
    myconsole.innerHTML = myconsole.innerHTML + "<br>" + msg;
    
    console.log(msg);
}



function l2dError(msg)
{
    if(!LAppDefine.DEBUG_LOG) return;
    
    l2dLog( "<span style='color:red'>" + msg + "</span>");
    
    console.error(msg);
};

function initBgSelector()
{
    var div = document.createElement('div');
    div.className = "darken";
    div.id = "darken";
    div.style.top = window.pageYOffset + "px";
    div.addEventListener("click", function(e) {
            document.body.removeChild(document.getElementById("selector"));
            document.body.removeChild(document.getElementById("darken"));
            document.body.style.overflow = "auto";
        }, false);
    document.body.appendChild(div);
    document.body.style.overflow = "hidden";
    var selector = document.createElement('div');
    selector.id = "selector";
    selector.className = "selector";
    selector.style.top = (window.pageYOffset + (window.innerHeight * 0.05)) + "px" ;
    document.body.appendChild(selector);
    for (var i = 0; i < BackgroundList.length; i++){
        var img = document.createElement('div');
        img.className = "thumbbutton";
        img.style.backgroundImage = "url(../assets/bg/static/"+BackgroundList[i].FILE+")";
        img.style.backgroundSize = "120px 90px";
        img.id = BackgroundList[i].FILE;
        img.addEventListener("click", function(e) {
            document.getElementById("back_ground").style.backgroundImage = "url(../assets/bg/static/"+this.id+")";
            document.body.removeChild(document.getElementById("selector"));
            document.body.removeChild(document.getElementById("darken"));
            document.body.style.overflow = "auto";
    }, false);
        document.getElementById("selector").appendChild(img);
    }
}

function loadCharList() {
    $(document.body).append($("<div></div>")
            .attr("id","darken")
            .addClass("darken")
            .css("top", window.pageYOffset + "px")
            .click(function(){
                $('#selector').remove();
                $('#darken').remove();
                $(document.body).css("overflow", "auto");
                thisRef.charData = CharData;
            }))
        .append($("<div></div>")
            .attr("id","selector")
            .addClass("selector")
            .css("top", (window.pageYOffset + (window.innerHeight * 0.05)) + "px"))
        .css("overflow", "hidden");
        $("#selector").append($("<div></div>")
                .attr("id","searchContainer")
                .addClass("searchContainer")
                .css({"padding" : "15px"})
                .append($("<input>")
                    .attr("id","searchField")
                    .addClass("form-control")
                    .css({"display" : "inline-block", "width" : "50%"})
                    .on("keyup", function(){
                        var key = event.keyCode || event.charCode;
                        search(key);
                    })))
            .append($("<div></div>")
                .attr("id","resultContainer")
                .addClass("resultContainer"));
            loadResults(this.charData);
}

function loadResults (data){
    $("#resultContainer").empty();
    for (var value in data){
        $("#resultContainer").append($("<div></div>")
            .addClass("megucaIcon")
            .attr("id","meguca_"+value)
            .css("background", "url(../assets/icon/"+data[value].ICON+")")
            .css("background-size", "130px 144px")
            .mouseover(function(){
                $(this).css("background-size", "105%");
            })
            .mouseout(function(){
                $(this).css("background-size", "100%");
            })
            .click(function(){
                $("#select_model").empty();
                initModelSelection(data[$(this).attr("id").slice(7)]);
                changeModel();
                $('#selector').remove();
                $('#darken').remove();
                $(document.body).css("overflow", "auto");
                thisRef.charData = CharData;
            }));     
    }
}

function search (key) {
    if (key != null){
        if (key == 8 || key == 46)
            this.charData = CharData;
    }
    var data = {};
    var r = new RegExp($("#searchField").val().toLowerCase().trim());
    for (var value in this.charData){
        if (r.test(this.charData[value].NAME.toLowerCase()))
            data[value] = this.charData[value];
    }
    console.log(CharData);
    this.charData = data;
    loadResults(this.charData);
}

function loadVoice(id){
    loadJSON(id, (response) => {
        console.log(JSON.parse(response));
        var voiceJson = JSON.parse(response);
        var options = "";
        for (var x in voiceJson.story){
            options += '<option value="'+x+'">'+x+'</option>';
        }
        $("#select_voice").html(options).prop("disabled", false);
        thisRef.voiceData = voiceJson;
    });
}

function loadJSON(id, callback) {   
    var path = "../json/"+id+".json";
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', path, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
    };
    xobj.send(null);  
}

function chg_voice(){
    var queue = this.voiceData.story[$("#select_voice").val()];
    motionSequence(queue);
}

function motionSequence(queue){
    if (queue.length == 0){
        //console.log("end");
        return;
    }
    //console.log(queue[0].autoTurnFirst);
    //console.log(live2DMgr.getModel(0).modelSetting.getMotionArrayId(LAppDefine.MOTION_GROUP_IDLE, queue[0].chara[0].motion));
    live2DMgr.changeMotion(live2DMgr.getModel(0).modelSetting.getMotionArrayId(LAppDefine.MOTION_GROUP_IDLE, queue[0].chara[0].motion));
    if (queue[0].chara[0].face != null)
        live2DMgr.changeExpression(queue[0].chara[0].face);
    setTimeout(() => {
        queue.shift();      
        motionSequence(queue);
    }, queue[0].autoTurnFirst * 1000);
}