var ws = new WebSocket('wss://' + location.host + '/groupcall');
var participants = {};
var user_audio = [];
var name;
var timeSinceBeginning = null;
var replyTime = null;
var x = 0;

/////////////////   NEW on pres.day
var muted_users = [];
var admin = null;
var controller =null;
var pptUploaded =0;
/////////////  canvas vars...
// variables for whiteboard sharing

var $ = function(id) {return document.getElementById(id)};
var rtd = false;                                                //real time drawing
var canvas;
var cxt;
var objectModified;
var circleClick = false;
var rectangleClick = false;
var triangleClick = false;
var textClick = false;
var lineClick = false;
var eraserMode = false;
var oldBrushType = '';
var oldFill = '';
var sendObjects = true;
var isRedoing = false;
var h = [];
var filledShape = true;

var changeMode;			//################################
var currentIcon;		//#############options - circle,rect, triangle, eraser,rtd,text,line,pencil
var changeBackgroundColor;
var oldStroke;
var currentIconColor = '#03a9f4';

//////////// presentation
var roomname;
var currentSlideNo = 0;


window.onbeforeunload = function() {
	ws.close();
};



ws.onmessage = function(message) {
	var parsedMessage = JSON.parse(message.data);
	console.info('Received message: ' + message.data);

	switch (parsedMessage.id) {
        case 'registrationFailed':
            console.log("Registration Failed!");
            // alert('Incorrect Username or Password!');
            $('modalHeading').innerHTML = "Invalid Credentials";
            $('modalText').innerHTML = "Incorrect Username or Password!";
            $('myModal').style.display = "block";
            document.getElementById('passwordField').value = "";
            document.getElementById('passwordField').focus();
            break;

        case 'registrationSuccess':
            console.log("Registration Success!");
            document.getElementById('join').style.display = 'none';
            document.getElementById('room').style.display = 'block';
            break;

		case 'existingParticipants':
			onExistingParticipants(parsedMessage);

            /// ADD the code here to add new user to UI..
            // updateUserList();
			break;
		case 'newParticipantArrived':
			onNewParticipant(parsedMessage);
			break;
		case 'participantLeft':
			onParticipantLeft(parsedMessage.name);
			break;
		case 'receiveVideoAnswer':
			receiveVideoResponse(parsedMessage);
			break;
		case 'iceCandidate':
			participants[parsedMessage.name].rtcPeer.addIceCandidate(parsedMessage.candidate, function (error) {
				if (error) {
					console.error("Error adding candidate: " + error);
					return;
				}
			});
			break;
		case 'publicChat':
			console.log('Recieved msg for public chat'+parsedMessage.message);
			document.getElementById('publicChat').innerHTML += '<li tabindex="1" style=""><b>'+parsedMessage.sender+'</b>: '+parsedMessage.message+'</li>';
			document.getElementById("publicChat").lastChild.focus();
			break;
		case 'privateChat':
			var sender = parsedMessage.sender;
			console.log('Recieved msg from '+sender+' and msg is: '+parsedMessage.message);
			var btn = document.getElementById(sender+'privateChat');
			register_popup(btn);
			document.getElementById(sender+'list').innerHTML += '<li tabindex="1" style="background-color: #7dc9e2; width: 100%; padding-left: 2px">'+parsedMessage.message+'</li>';
			document.getElementById(sender+'list').lastChild.focus();
			break;
		case 'previousPublicChat':
			timeSinceBeginning = parsedMessage.startTime;
            admin = parsedMessage.currentAdmin;
            controller = parsedMessage.currentController;
            if(name==admin){
                document.getElementById('adminPanelMenu').style.display = 'block';
                $("forAdminOnly"+name).style.display = "block";
            }
            else{
                $('clientMenu').style.display = 'block';
            }
            onChangeController();
			today = new Date(timeSinceBeginning);
			replyTime = new Date();
			displayTime();
			displayPublicChat(parsedMessage.list);
			console.log('Prev Chat'+parsedMessage.list);
            updateUserList();
			break;
		case 'showCanvas':
            document.getElementById('canvasWrapper').style.display = "inline-block";
            document.getElementById('videoWrapper').style.display = "none";
            document.getElementById('presentationWrapper').style.display = "none";
            document.getElementById('participantList').style.display = "none";
            // document.getElementById('wrapper-right').style.width = "20%";
            showPresenterVideo();
			// document.getElementById('canvasWrapper').style.display = "inline-block";
			// document.getElementById('wrapper-right').style.width = "20%";
			break;
        case 'showPresentation':
            document.getElementById('canvasWrapper').style.display = "none";
            document.getElementById('videoWrapper').style.display = "none";
            document.getElementById('participantList').style.display = "none";
            document.getElementById('presentationWrapper').style.display = "block";
            
            // // document.getElementById('wrapper-right').style.width = "20%";
            showPresenterVideo();
            break;
        case "startppt":
            startPresent(parsedMessage);
            $('presentationControl').style.display = "none";
            $('startSlideShow').style.display = "block";
            $('pptSlide0').style.display = "block";
            break;
		case 'object:modified':
			onRemoteObjectModified(JSON.parse(parsedMessage.object))
			break;
		case 'object:added':
			onRemoteObjectAdded(JSON.parse(parsedMessage.object))
			break;
		case 'object:removed':
			onRemoteObjectRemoved(JSON.parse(parsedMessage.object))
			break;
		case 'canvas:clear':
			onRemoteCanvasClear()
			break;
		case 'canvas:bringForward':
			onBringForward(parsedMessage.uuid)
			break;
		case 'canvas:sendBackwards':
			onSendBackward(parsedMessage.uuid)
			break;
		case 'bigLineAddedRemotely':
			onBigLineAddedRemotely(JSON.parse(parsedMessage.lineInfo))
			break;
		case 'sendCurrentState':
			onSendCurrentState(parsedMessage.forNewUser)
			break;
		case 'muteAudio':
			muteUserAudio(parsedMessage.of);
			break;
		case 'unmuteAudio':
			unmuteUserAudio(parsedMessage.of);
			break;
		case 'changeSlide':
			changeSlide(parsedMessage.number)
			break;
        case 'makeController':
            changeController(parsedMessage.newController);
            updateUserList();
            break;
        case 'adminLeft':
            // $('modalHeading').innerHTML = "Meeting Over";
            // $('modalText').innerHTML = "The Admin has left. Your meeting is closed.";
            // $('myModal').style.display = "block";
            alert('The Admin has left. Your meeting is closed.');
            leaveRoom();
            break;
        case "videoPresentMode":
            var url = "https://" + location.host + parsedMessage.url;
            $('shareVideoStream').height = window.innerWidth/4.5 * 0.75;
            $('shareVideoStream').width = window.innerWidth/4.5;
            $('shareVideoStream').src = url;
            break;
        case 'showVideoStream':
            showVideoStream();
            break;
		default:
			console.error('Unrecognized message', parsedMessage);
	}
}

function requestController() {
    if(name == controller) {
        //alert('You are already the Controller!');
        return;
    }
    publicChat('I want to become the Controller.');
}


function changeController(newController) {
    controller = newController;
    if(name == controller) {
        //alert('You may draw and present now.');
        $('currController').style.display = "inline-block";
    }
    else{
        $('currController').style.display = "none";
    }
    onChangeController();
}

function onChangeController(){


    //enable user to draw and show toolbar
    if(controller == name){

        var text =  $('drawing-mode').innerHTML;

        if(text == 'Edit scene'){

            canvas.isDrawingMode = true;

            canvas.selection = false;
            canvas.forEachObject(function(o) {
                o.selectable = false;
            });

        }
        else{
            canvas.isDrawingMode = false;

            canvas.selection = true;
            canvas.forEachObject(function(o) {
                o.selectable = true;
            });

        }

        $('toolbar').style.display = "block";
        $('fileform').style.display="block";
        $('videofileform').style.display = "block";
//        $('pptButton').style.display = "";
    }

    //disable user from drawing and hide toolbar
    else {

        canvas.isDrawingMode = false;

        canvas.selection = false;
        canvas.forEachObject(function(o) {
            o.selectable = false;
        });

        $('toolbar').style.display = "none";
        $('fileform').style.display="none";

        $('videofileform').style.display = "none";
        $('pptButton').style.display = "none";
    }

    $('startSlideShow').style.display = "none";
    if($('participantList').style.display == "none")
        showPresenterVideo();
}

//
// function muteUserAudio(username) {
//     var participant = participants[username];
//     participant.getAudioElement().muted = true;
//     participant.getVideoElement().muted = true;
// }
//
// function unmuteUserAudio(username) {
//     var participant = participants[username];
//     participant.getAudioElement().muted = false;
//     var participant = participants[username];
//     participant.getAudioElement().muted = true;
//     participant.getVideoElement().muted = true;
// }
//
// function unmuteUserAudio(username) {
//     var participant = participants[username];
//     participant.getAudioElement().muted = false;
//     participant.getVideoElement().muted = false;
// }

function muteUserAudio(username) {
    var participant = participants[username];
    var i = muted_users.indexOf(username);
    if(i == -1) {
        muted_users.push(participant.name);
    }

    if(name == participant.name) {
        // alert('You have been remotely muted.');
        $('mutedLI').style.display = "inline-block";
    }
    participant.getAudioElement().muted = true;
    participant.getVideoElement().muted = true;
}

function unmuteUserAudio(username) {
    var participant = participants[username];
    participant.getAudioElement().muted = false;
    participant.getVideoElement().muted = false;

    var i = muted_users.indexOf(username);
    if(i != -1) {
        muted_users.splice(i, 1);
    }
    if(name == participant.name) {
        // alert('You have been remotely Un-muted.');
        $('mutedLI').style.display = "none";
        participant.getAudioElement().muted = true;
        participant.getVideoElement().muted = true;
    }

}



function muteUser(btn) {
    if(name != admin) {
        return;
    }
    // var username = document.getElementById('adminList').value;
    var username = btn.name;
    muted_users.push(username);

    var participant = participants[username];
    console.log('Mute User: ' + participant.name);
    participant.getAudioElement().muted = true;
    participant.getVideoElement().muted = true;
    var message = {
        id : 'muteAudio',
        of : username,
    }
    // updateUserList();
    sendMessage(message);
    $('muteButton'+username).style.display="none";
    $('unmuteButton'+username).style.display="inline-block";


    // document.getElementById('checkers').style.display = 'block';
    // document.getElementById('adminList').style.display = 'none';
    // document.getElementById('adminWrapper').style.display = 'none';
    // button = document.getElementById('muteUser');
    // button.style.display = 'none';
    // button = document.getElementById('unmuteUser');
    // button.style.display = 'none';
    // button = document.getElementById('makeController');
    // button.style.display = 'none';

}

function unmuteUser(btn) {
    if(name != admin) {
        return;
    }
    // var username = document.getElementById('adminList').value;
    var username = btn.name;
    var i = muted_users.indexOf(username);
    if(i != -1) {
        muted_users.splice(i, 1);
    }
    var participant = participants[username];
    console.log('Unmute User: ' + participant.name);
    participant.getAudioElement().muted = false;
    participant.getVideoElement().muted = false;
    var message = {
        id : 'unmuteAudio',
        of : username
    }
    updateUserList();
    sendMessage(message);
    $('unmuteButton'+username).style.display="none";
    $('muteButton'+username).style.display="inline-block";

    // document.getElementById('checkers').style.display = 'block';
    // document.getElementById('adminList').style.display = 'none';
    // document.getElementById('adminWrapper').style.display = 'none';
    // button = document.getElementById('muteUser');
    // button.style.display = 'none';
    // button = document.getElementById('unmuteUser');
    // button.style.display = 'none';
    // button = document.getElementById('makeController');
    // button.style.display = 'none';

}

function makeController(btn) {
    if(name != admin) {
        return;
    }
    if($('currentControllerSpan'+ controller)) {
        $('currentControllerSpan' + controller).style.display = "none";
        $('makeControllerButton' + controller).style.display = "inline-block";

    }


    // var username = document.getElementById('adminList').value;
    var username = btn.name;
    if(username == controller) {
        $('modalHeading').innerHTML = "Controller Error";
        $('modalText').innerHTML = username + " is already the controller!";
        $('myModal').style.display = "block";
        // alert(username + 'is already the controller!');
        return;
    }
    controller = username;
    var message = {
        id : 'makeController',
        newController : controller
    }

    sendMessage(message);
    $('makeControllerButton'+username).style.display = "none";
    $('currentControllerSpan'+username).style.display = "inline-block";
    // $('adminButton' + controller).style.display = "inline-block";
    // document.getElementById('checkers').style.display = 'block';
    // document.getElementById('adminList').style.display = 'none';
    // document.getElementById('adminWrapper').style.display = 'none';
    // button = document.getElementById('muteUser');
    // button.style.display = 'none';
    // button = document.getElementById('unmuteUser');
    // button.style.display = 'none';
    // button = document.getElementById('makeController');
    // button.style.display = 'none';

}

function showAdminPanel(){
    document.getElementById('adminWrapper').style.display = 'block';
    document.getElementById('checkers').style.display = 'block';
    document.getElementById('adminList').style.display = 'none';
    button = document.getElementById('muteUser');
    button.style.display = 'none';
    button = document.getElementById('unmuteUser');
    button.style.display = 'none';
    button = document.getElementById('makeController');
    button.style.display = 'none';

}

function closeAdminWrapper(){
    document.getElementById('adminWrapper').style.display = 'none';
}

function muteOption() {
    var checkers = document.getElementById('checkers');
    checkers.style.display = 'none';

    var button = document.getElementById('muteUser');
    button.style.display = 'block';

    button = document.getElementById('unmuteUser');
    button.style.display = 'none';
    button = document.getElementById('makeController');
    button.style.display = 'none';

    var userList = document.getElementById('adminList');
    userList.style.display = 'block';
    userList.innerHTML = '<option value="none">Select One...</option>';
    var usersList;
    var allParticipants = Object.keys(participants);
    for(var i=0; i<allParticipants.length; i++) {
        if(muted_users.indexOf(allParticipants[i]) == -1) {
            usersList += '<option value="'+allParticipants[i]+'">' + allParticipants[i] + '</option>';
        }
    }
    userList.innerHTML += usersList;
}


function unmuteOption() {
	var checkers = document.getElementById('checkers');
	checkers.style.display = 'none';

	var button = document.getElementById('unmuteUser');
	button.style.display = 'block';

	button = document.getElementById('muteUser');
	button.style.display = 'none';
	button = document.getElementById('makeController');
	button.style.display = 'none';

	var userList = document.getElementById('adminList');
    userList.style.display = 'block';
	userList.innerHTML = '<option value="none">Select One...</option>';
	var usersList;
	var allParticipants = Object.keys(participants);
	for(var i=0; i<allParticipants.length; i++) {
		if(muted_users.indexOf(allParticipants[i]) != -1) {
			usersList += '<option value="'+allParticipants[i]+'">' + allParticipants[i] + '</option>';
		}
	}
	userList.innerHTML += usersList;
}

function controllerOption() {
	var checkers = document.getElementById('checkers');
	checkers.style.display = 'none';

	var button = document.getElementById('makeController');
	button.style.display = 'block';

	button = document.getElementById('muteUser');
	button.style.display = 'none';
	button = document.getElementById('unmuteUser');
	button.style.display = 'none';

	var userList = document.getElementById('adminList');
    userList.style.display = 'block';
	userList.innerHTML = '<option value="none">Select One...</option>';
	var usersList;
	var allParticipants = Object.keys(participants).sort();
	for(var i=0; i<allParticipants.length; i++) {
		usersList += '<option value="'+allParticipants[i]+'">' + allParticipants[i] + '</option>';
	}
	userList.innerHTML += usersList;
}


function hideCanvas() {
    document.getElementById('canvasWrapper').style.display = "none";
    $('videoStreamWrapper').style.display = "none";
    document.getElementById('presentationWrapper').style.display = "none";
    document.getElementById('presenterVideoWrapper').style.display = "none";
    document.getElementById('participantList').style.display = "block";
    document.getElementById('videoWrapper').style.display = "block";
    // document.getElementById('wrapper-right').style.width = "25%";
}

function showCanvas(){
	if(controller == name) {
        sendMessage({
            id: 'showCanvas'
        });
    }
	document.getElementById('canvasWrapper').style.display = "inline-block";
    document.getElementById('videoWrapper').style.display = "none";
    document.getElementById('presentationWrapper').style.display = "none";
    document.getElementById('participantList').style.display = "none";
    $('videoStreamWrapper').style.display = "none";
	// document.getElementById('wrapper-right').style.width = "20%";
    showPresenterVideo();
}

var pptCounter = 0;

function showPresentation(){
    if(controller == name) {
        sendMessage({
            id: 'showPresentation'
        });
        if(pptCounter == 0)
            $('fileform').style.display="block";
        else {
            $('fileform').style.display = "none";
            $('pptButton').style.display = "block";
        }
    }
    else{
        $('fileform').style.display="none";
    }
    document.getElementById('canvasWrapper').style.display = "none";
    document.getElementById('videoWrapper').style.display = "none";
    document.getElementById('participantList').style.display = "none";
    document.getElementById('presentationWrapper').style.display = "block";
    $('videoStreamWrapper').style.display = "none";
    // document.getElementById('wrapper-right').style.width = "20%";
    showPresenterVideo();
}

function showVideoStream(){
    if(controller == name) {
        sendMessage({
            id: 'showVideoStream'
        });
        $('videofileform').style.display="block";
    }
    else{
        $('videofileform').style.display="none";
    }
    document.getElementById('canvasWrapper').style.display = "none";
    document.getElementById('videoWrapper').style.display = "none";
    document.getElementById('participantList').style.display = "none";
    document.getElementById('presentationWrapper').style.display = "none"
    document.getElementById('videoStreamWrapper').style.display = "block";
    // document.getElementById('wrapper-right').style.width = "20%";
    // showPresenterVideo();
}

function showPresenterVideo(){
    document.getElementById('presenterVideo').width = window.innerWidth/4.5;
    document.getElementById('presenterVideo').height = (window.innerWidth/4.5) * (3/4);
    document.getElementById('presenterVideo').src = participants[controller].getVideoElement().src;
    document.getElementById('presenterVideo').autoplay = true;
    document.getElementById('presenterVideoWrapper').style.display = 'inline-block';
}


function checkTime(i) {
	if (i < 10) {i = "0" + i};  // add zero in front of numbers < 10
	return i;
}

// function startTimer() {
// 	var h = today.getHours();
// 	var m = today.getMinutes();
// 	var s = today.getSeconds();
// 	console.log('Hours: ' + h + 'Minutes: ' + m + 'Seconds: ' + s);
// 	m = checkTime(m);
// 	s = checkTime(s);
// 	document.getElementById('time').innerHTML = " " + h + ":" + m + ":" + s;
// 	var t = setTimeout(startTimer, 500);
// }

function displayTime() {
	var currentDate = new Date();
	var newDate = new Date(currentDate.getTime() - replyTime.getTime() + timeSinceBeginning);
	newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset());
	// console.log('The Difference in Time Is: ' + today.getMilliseconds());
	// startTimer();
	var h = newDate.getHours();
	var m = newDate.getMinutes();
	var s = newDate.getSeconds();
	//console.log('Hours: ' + h + 'Minutes: ' + m + 'Seconds: ' + s);
	m = checkTime(m);
	s = checkTime(s);
	document.getElementById('time').innerHTML = " " + h + ":" + m + ":" + s;
	var t = setTimeout(displayTime, 500);
}

function displayPublicChat(list){
	str="";
	for (var i = 0; i < list.length; i++){
		str += '<li tabindex="1" style=""><b>'+list[i].sender+'</b>: '+list[i].message+'</li>';
	}
	document.getElementById('publicChat').innerHTML += str;
}

////////////////////////  NEW  /////////////
function publicChat(msg){
	sendMessage({id:'publicChat',
		message:msg,
		sender:name
	});
	console.log('Message send'+msg);
	document.getElementById('publicChat').innerHTML += '<li tabindex="1" style="text-align: right;"><b>'+name+'</b>: '+msg+'</li>';
	document.getElementById("publicChat").lastChild.focus();
}

	function privateChat(msg,receiver){
	sendMessage({
		id:'privateChat',
		message:msg,
		sender:name,
		receiver:receiver
	});
	document.getElementById(receiver+'list').innerHTML += '<li tabindex="1" style="text-align: right; background-color: #ffffff; width: 100%; padding-right: 2px">'+msg+'</li>';
	document.getElementById(receiver+'list').lastChild.focus();
}

/////////////////////////  NEW  ////////////////

function publicChatEnterKey(event,inp) {
	console.log('Key code is:'+event.keyCode);
	if (event.keyCode == 13) {
		event.preventDefault();
		var msg=inp.value;
		publicChat(msg);
		inp.value="";
	}
}

function privateChatEnterKey(event, inp){
	var receiver =inp.name;
	console.log('Key code is:'+event.keyCode+' for '+receiver);
	if (event.keyCode == 13) {
		event.preventDefault();
		var msg=inp.value;
		privateChat(msg,receiver);
		inp.value="";
	}
}

/////////////////NEW/////////////

function getVideo(btn){
    var usrname = btn.name;
    //user_audio.push(usrname);

    var i = user_audio.indexOf(usrname);
    if(i != -1) {
        user_audio.splice(i, 1);
    }

    btn.disabled = true;
    var message = {
        id : 'cancelVideo',
        of : usrname,
        sender : name
    }
    sendMessage(message);
    onParticipantLeft(usrname);

    var participant = new Participant(usrname);
    participants[usrname] = participant;
	var constraints = {
		audio : true,
		video : {
			mandatory: {
				minWidth: 320,
				maxWidth: 320,
				minHeight: 240,
				maxHeight: 240,
				maxFrameRate: 10,
				minFrameRate: 10
			}
		}
	};

	/// ADD the code here to add new user to UI..
    updateUserList();

    // This code is for making the conn. to rcv(only) video
    var video = participant.getVideoElement();

    var options = {
        remoteVideo: video,
        mediaConstraints: constraints,
        onicecandidate: participant.onIceCandidate.bind(participant)
    }

    participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
        function (error) {
            if(error) {
                return console.error(error);
            }
            this.generateOffer (participant.offerToReceiveVideo.bind(participant));
        });

    btn.disabled = false;
    //btn.value = "Get Audio";
    video.style.display="inline-block";
}

function getAudio(btn){

	var usrname = btn.name;
    user_audio.push(usrname);
    btn.disabled = true;

	var message = {
		id : 'cancelVideo',
		of : usrname,
		sender : name
	}

	sendMessage(message);
	onParticipantLeft(usrname);

	var participant = new Participant(usrname);
	participants[usrname] = participant;
	constraints={
		audio : true,
		video : false
	};

	/// ADD the code here to add new user to UI..
	updateUserList();

	// This code is for making the conn. to rcv(only) video
	var audio = participant.getAudioElement();
    var video = participant.getVideoElement();

    var options = {
		remoteVideo: audio,
		mediaConstraints: constraints,
		onicecandidate: participant.onIceCandidate.bind(participant)
	}

	participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
		function (error) {
			if(error) {
				return console.error(error);
			}
			this.generateOffer (participant.offerToReceiveVideo.bind(participant));
		});

    btn.disabled = false;
    //btn.value = "Get Video";
    video.style.display="none";
}

function updateUserList(){
	console.log('The existing participants are: ' + Object.keys(participants));
	//var user_list = document.getElementById('list_participants');
	var chatSidebar = document.getElementById('chatSidebar');
//
// <li class="w3-padding-8 w3-hover-khaki">
//         <button class="w3-closebtn w3-btn w3-tiny w3-margin-right w3-light-blue w3-hover-opacity">Get Audio</button>
//     <button class="w3-closebtn w3-btn w3-tiny w3-margin-right w3-light-blue w3-hover-opacity" onclick="register_popup('narayan-prusty', 'Narayan Prusty');">Chat</button>
//         <img src="img_avatar2.png" class="w3-left w3-circle w3-margin-right w3-margin-left" style="width:25px;" />
//         <span class="w3-small ">Joe Trivedi</span>
//     </li>

	while (chatSidebar.firstChild) {
		chatSidebar.removeChild(chatSidebar.firstChild);
	}

	var users = Object.keys(participants);
	for (var i in users) {

		if(users[i] == name) {
			continue;
		}

		var listItem = document.createElement('li');
		var avButton = document.createElement('button');
		var chatButton = document.createElement('button');
        var imgTag = document.createElement('img');
        var nameSpan = document.createElement('span');

		listItem.className = "w3-padding-8 w3-hover-khaki";
		nameSpan.innerHTML = users[i];
        nameSpan.className = "w3-margin-right";

        imgTag.src = "img_avatar2.png";
        imgTag.className = "w3-left w3-circle w3-margin-right w3-margin-left";
        imgTag.style.width = "25px";

        if(users[i]==controller)
            var adminButton = '<img title="Current Controller" id="adminButton'+ users[i] +'" style="width: 25px; display: inline-block;" src="admin.png" name="' + users[i] + 'class="w3-margin-left w3-right w3-circle w3-margin-right w3-margin-left w3-hover-opacity"/>';

        else
            var adminButton = '<img id="adminButton'+ users[i] +'" style="width: 25px; display: none;" src="admin.png" name="' + users[i] + 'class="w3-margin-left w3-right w3-circle w3-margin-right w3-margin-left w3-hover-opacity"/>';


        var chatButton = '<img title="Chat Privately" style="width: 25px; cursor: pointer;" src="chat.png" id ="'+users[i]+'privateChat" name="'+ users[i] +'" onclick="register_popup(this);" class="w3-right w3-circle w3-margin-right w3-margin-left w3-hover-opacity"/>';
        if (user_audio.indexOf(users[i]) == -1) {
			var avButton = '<img title="Get Audio only" style="width: 25px; cursor: pointer;" src="audio.png" name="' + users[i] + '" onclick="getAudio(this);" class="w3-right w3-circle w3-margin-right w3-margin-left w3-hover-opacity"/>';
		} else {
			var avButton = '<img title="Get Video+Audio" style="width: 25px; cursor: pointer;" src="video.png" name="' + users[i] + '" onclick="getVideo(this);" class="w3-right w3-circle w3-margin-right w3-margin-left w3-hover-opacity"/>';
		}

        listItem.innerHTML += avButton;
        listItem.innerHTML += chatButton;
        listItem.appendChild(imgTag);
        listItem.appendChild(nameSpan);
        if(adminButton)
            listItem.innerHTML += adminButton;

        ////////////////  NEW on pres. day ////////////////
        // if(name == admin) {
        //     if (muted_users.indexOf(users[i]) == -1) {
        //         var muteButton = '<button name="' + users[i] + '" onclick="muteUser(this);" class="w3-btn w3-tiny">' + 'Mute' + '</button>';
        //     } else {
        //         var muteButton = '<button name="' + users[i] + '" onclick="unmuteUser(this);" class="w3-btn w3-tiny w3-red">' + 'Unmute' + '</button>';
        //     }
        //     mainDiv.innerHTML += muteButton;
        // }

        /////////////////////////////////

        // console.log(mainDiv);

		chatSidebar.appendChild(listItem);

	}
	//var users_avia = Object.keys(participants);
	//user_list.innerHTML = "";


	// for(p in users_avia){
     //    console.log(users_avia[p] in user_audio);
     //    var exist = user_audio.indexOf(users_avia[p]);
     //    if(exist != -1){
     //        var show='<li>'+
     //            '<img src="img_avatar2.png" class="w3-left w3-circle w3-margin-right" style="width:30px" />'+
     //            users_avia[p]+
     //            '<button onclick="getVideo(this);" name="'+users_avia[p]+'" class="w3-btn w3-blue w3-tiny w3-round-xxlarge w3-margin-left">'+
     //            'Get Video'+
     //            '</button>' +
     //            '</li>';
    //
     //    user_list.innerHTML += show;
    //
     //    }
	// 	else if(users_avia[p]!=name){
     //        var show='<li>'+
     //            '<img src="img_avatar2.png" class="w3-left w3-circle w3-margin-right " style="width:30px" />'+
     //            users_avia[p]+
     //            '<button onclick="getAudio(this);" name="'+users_avia[p]+'" class="w3-btn w3-red w3-tiny w3-round-xxlarge w3-margin-left">'+
     //            'Get Audio'+
     //            '</button>' +
     //            '</li>';
    //
     //        user_list.innerHTML += show;
     //    }
	// }


	document.getElementById('noOfUsers').innerHTML = " " + Object.keys(participants).length;

	//var msec = Date.parse("March 21, 2012");
	var d = new Date();
	//document.getElementById("demo").innerHTML = d;
	document.getElementById('date').innerHTML = d.getDate()+"-"+(d.getMonth()+1)+'-'+d.getFullYear();
}

function register() {
	name = document.getElementById('name').value;
	var room = document.getElementById('roomName').value;
    var password = document.getElementById('passwordField').value;
    roomname = room;
	document.getElementById('userNameDisplay').innerText = " " + name;
	document.getElementById('roomNameDisplay').innerText = " " + room;

	var message = {
		id : 'joinRoom',
		name : name,
        password : password,
		room : room,
	}
	sendMessage(message);
}

function onNewParticipant(request) {
	receiveVideo(request.name);
    if(name == admin)
        $("forAdminOnly"+request.name).style.display = "block";
}

function receiveVideoResponse(result) {
	participants[result.name].rtcPeer.processAnswer (result.sdpAnswer, function (error) {
		if (error) return console.error (error);
	});
    if(name == admin){
        $("forAdminOnly"+result.name).style.display = "block";
        if(controller == result.name){
            $('makeControllerButton'+result.name).style.display = "none";
            $('currentControllerSpan'+result.name).style.display = "inline-block";
        }
    }
}

function callResponse(message) {
	if (message.response != 'accepted') {
		console.info('Call not accepted by peer. Closing call');
		stop();
	} else {
		webRtcPeer.processAnswer(message.sdpAnswer, function (error) {
			if (error) return console.error (error);
		});
	}
}

function onExistingParticipants(msg) {

	var constraints = {
		audio : true,
		video : {
			mandatory: {
				minWidth: 320,
				maxWidth: 320,
				minHeight: 240,
				maxHeight: 240,
				maxFrameRate: 10,
				minFrameRate: 10
			}
		}
	};

	console.log(name + " registered in room " + room);
	var participant = new Participant(name);
	participants[name] = participant;
	var video = participant.getVideoElement();



	var options = {
		localVideo: video,
		mediaConstraints: constraints,
		onicecandidate: participant.onIceCandidate.bind(participant)
	}

	participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
		function (error) {
			if(error) {
				return console.error(error);
			}
			this.generateOffer (participant.offerToReceiveVideo.bind(participant));
		});

	msg.data.forEach(receiveVideo);
	console.log('All Users: '+ msg.data);
}

function hideBigVideo() {
	document.getElementById('videoBigDiv').style.display = "none";
}

function leaveRoom() {
	sendMessage({
		id : 'leaveRoom'
	});

	for ( var key in participants) {
		participants[key].dispose();
	}

	document.getElementById('join').style.display = 'block';
	document.getElementById('room').style.display = 'none';

	// ws.close();
    window.location ="/";
}

function receiveVideo(sender) {
	var participant = new Participant(sender);
	participants[sender] = participant;

	/// ADD the code here to add new user to UI..
	updateUserList();

	var constraints = {
		audio : true,
		video : {
			mandatory: {
				minWidth: 320,
				maxWidth: 320,
				minHeight: 240,
				maxHeight: 240,
				maxFrameRate: 10,
				minFrameRate: 10
			}
		}
	};

	// This code is for making the conn. to rcv(only) video
	var video = participant.getVideoElement();

	var options = {
		remoteVideo: video,
        mediaConstraints: constraints,
        onicecandidate: participant.onIceCandidate.bind(participant)
	}

	participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
		function (error) {
			if(error) {
				return console.error(error);
			}
			this.generateOffer (participant.offerToReceiveVideo.bind(participant));
		});
}

function onParticipantLeft(usrname) {
	console.log('Participant ' + usrname + ' left');
    if(Object.keys(participants).indexOf(usrname) != -1) {
        var participant = participants[usrname];
        participant.dispose();
        delete participants[usrname];
    }
	/// ADD the code here to add new user to UI..
	updateUserList();
}

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	console.log('Senging message: ' + jsonMessage);
	ws.send(jsonMessage);
	console.log('message sent !');
	console.log(ws);
}

/////////////  CANVAS FUNCTIONS

ws.onclose = function () {

	console.log('websocket closed !!');                                             //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!11
    // alert('The Websocket has been closed! Please refresh your page.');
}

function onRemoteObjectModified(rawObject){
	// TODO: This can probably be fixed in fabricjs' toObject.
	// Serialization issue. Remove group fill.
	//if(storeMod == true)
	// updateModifications(true);


	console.log('some object modified by peer');
	console.log('the object is : ' + rawObject.toString());
	console.log(rawObject.fill)

	if(rawObject.type === 'group') {
		console.log('group moved');
		console.log(rawObject);
		delete rawObject.fill
		delete rawObject.stroke
	}

	var fabricObject = canvas.getObjectByUUID(rawObject.uuid)

	if(fabricObject) {
		// Update all the properties of the fabric object.
		fabricObject.set(rawObject)
		console.log(fabricObject);

		if(rawObject.type == 'line') {
			fabricObject.left = rawObject.left              //required so that when line is moved in one peer , it also moves
			fabricObject.top = rawObject.top                // correctly in other peers.
		}

		fabricObject.setCoords();               //very important line. Otherwise the cursor cannot detect object has moved in the
		//peer
		canvas.renderAll()
	} else {
		console.warn('No object found in scene:', rawObject.uuid)
	}
}


// Update canvas when other clients made changes.
//  socket.on('object:added', function(rawObject) {

function onRemoteObjectAdded(rawObject){
	console.log('object added by some peer');



	// Revive group objects.
	if(rawObject.type === 'group') {
		rawObject.objects = rawObject.__objects
		delete rawObject.fill
	}

	fabric.util.enlivenObjects([rawObject], function(fabricObjects) {
		fabricObjects.forEach(function(fabricObject) {
			// Prevent infinite loop, because this triggers canvas`
			// object:added, which in turn calls this function.
			fabricObject.remote = true

            fabricObject.selectable = false;

			console.log(fabricObject);
			canvas.add(fabricObject)
		})
	})
}



//socket.on('object:removed', function(rawObject) {

function onRemoteObjectRemoved(rawObject){

	var fabricObject = canvas.getObjectByUUID(rawObject.uuid)
	if(fabricObject) {
		canvas.remove(fabricObject)
	} else {
		console.warn('No object found in scene:', rawObject.uuid)
	}
}

//socket.on('canvas:clear', function() {
function onRemoteCanvasClear(){
	canvas.clear()
}

//    socket.on('canvas:bringForward', function(uuid) {
function onBringForward(uuid){
	var fabricObject = canvas.getObjectByUUID(uuid)
	canvas.bringForward(fabricObject)
}

function onSendBackward(uuid){
//    socket.on('canvas:sendBackwards', function(uuid) {
	var fabricObject = canvas.getObjectByUUID(uuid)
	canvas.sendBackwards(fabricObject)
}

function onBigLineAddedRemotely(lineInfo){
//  socket.on('bigLineAddedRemotely' , function(lineInfo){

    console.log('inside onBigLineAdded')
    var remotePoints = [lineInfo.x1 , lineInfo.y1,lineInfo.x2,lineInfo.y2]

    var remoteLine = new fabric.Line(remotePoints, {
        strokeWidth: 5,
        stroke: lineInfo.color,
        originX: 'center',
        originY: 'center',
        left : lineInfo.left,
        top : lineInfo.top,
        uuid : lineInfo.uuid
    });
    remoteLine.remote = true
    //sendObjects = false;
    canvas.add(remoteLine);
    //sendObjects = true;

};


function onSendCurrentState(NewUser){
//    socket.on('sendCurrentState' , function(){

	var objectsArray = canvas.getObjects();
	var objectsJSONarray = [];

	objectsArray.forEach(function(fabricObject){
		objectsJSONarray.push(JSON.stringify(fabricObject))
	})

	//socket.emit('receiveCurrentState', objectsJSONarray)
	sendMessage({
		id : 'receiveCurrentState',
		objectsArray :  objectsJSONarray,
		forNewUser : NewUser
	})


}

// client code for whiteboard sharing starts here !!!!!!

//'use strict'

//moment.locale('nl')

/*
 var state = [];
 var mods = 0;
 var storeMod = true;
 */

var Dotd = function() {
	var _this = this
//    socket = io()
//socket = io.connect(ip + ':8888');
//socket = io.connect(ipWithPort);


	ws.onopen = function(evt){

        $('joinButton').disabled = false;

		canvas = new fabric.Canvas('c', {
			isDrawingMode: true,
			backgroundColor : "#fff"
		});

		var wid =window.innerWidth*9/16;

		canvas.setHeight(550);
		canvas.setWidth(550);

		cxt = canvas.getContext('2d');
		// For debugging.
		window._canvas = canvas
		// Load initial state from the server.
		if(_this.loaded) {
			// For now just reload the page. May be possible to reinject
			// state.js and update state in place.
			location.reload()                                                   //???????
		} else {
//            canvas.loadFromJSON(initialState)
//            canvas.renderAll()

			_this.initUI()
			_this.initEvents()
			_this.loaded = true
		}

	}

}

window.app = {
	brushes: {},
	//dayOftheWeek: parseInt(moment().format('e'), 10),
	init: function() {
		var _this = this
		console.log('Init Dotd board...')
		this.dotd = new Dotd()

		// common.init(_this)

		// Reload the page when the next day occurs.
		/*       setInterval(function() {
		 var currentDay = parseInt(moment().format('e'), 10)
		 if(currentDay !== _this.dayOftheWeek) {
		 location.reload()
		 }
		 }, 3000)
		 */
	},
	fabric: fabric,
}


Dotd.prototype.setBrushWidth = function(width) {
	width = parseInt(width, 10) || 1
	console.log('Setting brush size to', width)
	canvas.freeDrawingBrush.width = width
	$('drawing-line-width-info').innerHTML = width
	$('drawing-line-width').value = width
	// localStorage.setItem('brushWidth', width)
}


/**
 * Sets the fill color in the UI and prepares the brush.
 * Changes fill of a selected object. Expect a hex color
 * for now.
 */
Dotd.prototype.setFillColor = function(color) {
	if(!color) color = '#000000'
	// canvas.freeDrawingBrush.color = color

    $('fill-color').value = color
    $('fill-color_edit').value = color					//##############

	$('fill-color').value = color
	// localStorage.setItem('fillColor', color)
	var fabricObject = canvas.getActiveObject()
	// Changing color while object selected, changes the fill of that object.
	if(fabricObject) {
		if(fabricObject.type === 'group') {
			var newColor = new fabric.Color(color)
			fabricObject._objects.forEach(function(groupObject) {
				var currentColor = new fabric.Color(groupObject.fill)
				// Keep opacity intact.                                                                 ???
				newColor._source[3] = currentColor._source[3]
				groupObject.set({fill: newColor.toRgba()})
			})

		} else {
			fabricObject.set({ fill: color})
		}

		canvas.renderAll()
		// Trigger an object update.
		objectModified({target: fabricObject})
	}
}


Dotd.prototype.setStrokeColor = function(color) {
	if(!color) color = '#000000'

    canvas.freeDrawingBrush.color = color				//######################

    $('stroke-color').value = color
    $('stroke-color_edit').value = color;			//############

	// localStorage.setItem('strokeColor', color)
	var fabricObject = canvas.getActiveObject()
	// Changing color while object selected, changes the fill of that object.
	if(fabricObject) {
		fabricObject.set({ stroke: color})
		canvas.renderAll()
		// Trigger an object update.
		objectModified({target: fabricObject})
	}
}


Dotd.prototype.initUI = function() {
	var _this = this

	// $('drawing-mode-selector').value = 'pencil'
	// this.setBrushWidth(localStorage.getItem('brushWidth'))
	// this.setFillColor(localStorage.getItem('fillColor'))
	// this.setStrokeColor(localStorage.getItem('strokeColor'))

	fabric.Object.prototype.transparentCorners = false

	var drawingModeEl = $('drawing-mode')
	var insertTextEl = $('insert-text')

	var insertCircleEl = $('insert-circle')
	var insertRectangleEl = $('insert-rectangle')
	var insertTriangleEl = $('insert-triangle')
	var insertLineEl = $('insert-line')
    var freeDrawingEl = $('free-drawing')

	var drawingOptionsEl = $('drawing-mode-options')
	var editOptionsEl = $('edit-mode-options')

	var fillColorEl = $('fill-color')
	var fillColorElEdit = $('fill-color_edit')                          //changed!!!!
	var strokeColorEl = $('stroke-color')
	var strokeColorElEdit = $('stroke-color_edit')                      //changed!!!!

	var drawingLineWidthEl = $('drawing-line-width')

	var dolphinDayEl = document.querySelector('#dolphin-day-container span')

    currentIcon = 'pencil';													//so that by default pencil is enabled
    changeBackgroundColor('free-drawing');

    // dolphinDayEl.innerHTML = moment().format('dddd' + '</span></div>')

    changeMode  = function() {							//#######################################


//		canvas.isDrawingMode = !canvas.isDrawingMode;

        if (drawingModeEl.innerHTML == 'Draw mode') {
            //drawing mode

            drawingModeEl.innerHTML = 'Edit scene'
            drawingOptionsEl.style.display = 'block'
            editOptionsEl.style.display = 'none';

            canvas.isDrawingMode = true;

            currentIcon = 'pencil';
            changeBackgroundColor('free-drawing');


        } else {
            drawingModeEl.innerHTML = 'Draw mode'
            drawingOptionsEl.style.display = 'none'
            editOptionsEl.style.display = 'block'

            canvas.isDrawingMode = false;

            canvas.selection = true;
            canvas.forEachObject(function(o) {			//##############
                o.selectable = true;
            });
        }

        canvas.forEachObject(function(o){ o.setCoords() })			//##################needed so that the objects have their dimensions set correctly.


    }


    // dolphinDayEl.innerHTML = moment().format('dddd' + '</span></div>')

	drawingModeEl.onclick = changeMode;

    insertTextEl.onclick = function() {

        textClick = true;
        currentIcon = 'text'		//###############

        changeBackgroundColor('insert-text');

        shapeDrawingOn();
        /*
         var textObject = new fabric.IText('Edit me...', {
         fontFamily: 'arial black',
         //left: Math.random() * 1000,
         //top: Math.random() * 500,
         left: 0,
         top: 0,
         fill: localStorage.getItem('fillColor') || '#00000',
         })

         canvas.add(textObject)
         */
    }


    insertCircleEl.onclick = function(){

        //canvas.isDrawingMode = false;
        //canvas.selection = false;
        circleClick = true;
        currentIcon = 'circle';		//###############
        changeBackgroundColor('insert-circle');

        shapeDrawingOn();
        //
        //var circleObj = new fabric.Circle({
        //    radius: 20, fill: 'green', left: 20, top: 20
        //});

        //canvas.add(circleObj);

        // var r = confirm("Do you want a filled circle ?");
        //
        // if(r == true){
        //     filledShape = true;
        // }
        //
        // else{
        //     filledShape = false;
        // }
        //


    }

    insertRectangleEl.onclick = function(){

        //canvas.isDrawingMode = false;
        rectangleClick = true;
        currentIcon = 'rectangle'		//###############
        changeBackgroundColor('insert-rectangle');

        shapeDrawingOn();
        //###################
        // var r = confirm("Do you want a filled rectangle ?");
        //
        // if(r == true){
        //     filledShape = true;
        // }
        //
        // else{
        //     filledShape = false;
        // }

    }

    insertTriangleEl.onclick = function(){

        //canvas.isDrawingMode = false;
        triangleClick = true;
        currentIcon = 'triangle'		//###############
        changeBackgroundColor('insert-triangle');

        shapeDrawingOn();

        // var r = confirm("Do you want a filled triangle?");
        //
        // if(r == true){
        //     filledShape = true;
        // }
        //
        // else{
        //     filledShape = false;
        // }


    }

    insertLineEl.onclick = function(){
        //canvas.isDrawingMode = false;
        lineClick = true;
        currentIcon = 'line'		//###############
        changeBackgroundColor('insert-line');

        shapeDrawingOn();
    }
    freeDrawingEl.onclick = function(){

        if(currentIcon == 'eraser'){												//#################
            canvas.freeDrawingBrush.color = oldStroke;
        }


        currentIcon = 'pencil'
        changeBackgroundColor('free-drawing');

        canvas.isDrawingMode = true;

    }


    function shapeDrawingOn(){

        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.forEachObject(function(o) {
            o.selectable = false;
        });

    }

	if(fabric.PatternBrush) {
		app.brushes.vline = new fabric.PatternBrush(canvas)
		app.brushes.vline.getPatternSrc = function() {
			var patternCanvas = fabric.document.createElement('canvas')
			patternCanvas.width = patternCanvas.height = 10
			var ctx = patternCanvas.getContext('2d')

			ctx.strokeStyle = this.color
			ctx.lineWidth = 5
			ctx.beginPath()
			ctx.moveTo(0, 5)
			ctx.lineTo(10, 5)
			ctx.closePath()
			ctx.stroke()

			return patternCanvas
		}

		app.brushes.hline = new fabric.PatternBrush(canvas)
		app.brushes.hline.getPatternSrc = function() {
			var patternCanvas = fabric.document.createElement('canvas')
			patternCanvas.width = patternCanvas.height = 10
			var ctx = patternCanvas.getContext('2d')

			ctx.strokeStyle = this.color
			ctx.lineWidth = 5
			ctx.beginPath()
			ctx.moveTo(5, 0)
			ctx.lineTo(5, 10)
			ctx.closePath()
			ctx.stroke()

			return patternCanvas
		}

		app.brushes.square = new fabric.PatternBrush(canvas)
		app.brushes.square.getPatternSrc = function() {
			var squareWidth = 10
			var squareDistance = 2

			var patternCanvas = fabric.document.createElement('canvas')
			patternCanvas.width = patternCanvas.height = squareWidth + squareDistance
			var ctx = patternCanvas.getContext('2d')
			ctx.fillStyle = this.color
			ctx.fillRect(0, 0, squareWidth, squareWidth)
			return patternCanvas
		}

		app.brushes.diamond = new fabric.PatternBrush(canvas)
		app.brushes.diamond.getPatternSrc = function() {
			var squareWidth = 10, squareDistance = 5
			var patternCanvas = fabric.document.createElement('canvas')
			var rect = new fabric.Rect({
				width: squareWidth,
				height: squareWidth,
				angle: 45,
				fill: this.color,
			})

			var canvasWidth = rect.getBoundingRectWidth()

			patternCanvas.width = patternCanvas.height = canvasWidth + squareDistance
			rect.set({ left: canvasWidth / 2, top: canvasWidth / 2 })

			var ctx = patternCanvas.getContext('2d')
			rect.render(ctx)

			return patternCanvas
		}
		app.brushes.pencil = new fabric.PencilBrush(canvas)
		app.brushes.spray = new fabric.SprayBrush(canvas)
		app.brushes.circle = new fabric.CircleBrush(canvas)
	}


	// $('drawing-mode-selector').onchange = function() {
    //
	// 	console.log('drawing mode selector onchange called');
    //
	// 	if(this.value in app.brushes) {
	// 		canvas.currentBrush = this.value
	// 		console.log('Switching brush to', canvas.currentBrush)
	// 		canvas.freeDrawingBrush = app.brushes[this.value]
	// 		canvas.freeDrawingBrush.color = fillColorEl.value
	// 		canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10) || 1
	// 	} else {
	// 		console.warn('Invalid brush! ', this.value)
	// 	}
	// }

	fillColorEl.onchange = fillColorElEdit.onchange = function() {_this.setFillColor(this.value)}
	strokeColorEl.onchange = strokeColorElEdit.onchange = function() {_this.setStrokeColor(this.value)}

	drawingLineWidthEl.onchange = function() {_this.setBrushWidth(this.value)}

	if (canvas.freeDrawingBrush) {

		canvas.freeDrawingBrush.color = strokeColorEl.value
		canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10) || 1
		canvas.freeDrawingBrush.shadowBlur = 0;
	}

}


Dotd.prototype.initEvents = function() {
	var _this = this
	var clearEl = $('clear-canvas');
	var clearElEdit = $('clear-canvas_edit');

	clearEl.onclick = clearElEdit.onclick = function() {

		var ans = confirm('Do your really want to clear canvas ? You cannot undo this action')

		if(ans == true)
		{
			canvas.clear()
			//socket.emit('canvas:clear', {})
			sendMessage({
				id : 'canvas:clear'
			});
		}
	}


	// objectModified event may be used by other similar events like
	// 'text:changed'.
	objectModified = function(e) {


		if(e.target instanceof fabric.Group){
			var fabricGroupObject = e.target
			console.log('group modified locally' + e.target);

			fabricGroupObject.forEachObject(function(obj){
				//   socket.emit('object:modified', JSON.stringify(obj))
				sendMessage({
					id : 'object:modified',
					//obj : JSON.stringify(obj)                 //check
					object : JSON.stringify(obj)
				})

			})
		}

		else{

			var fabricObject = e.target
			console.log('object modified locally' + e.target);
			//   socket.emit('object:modified', JSON.stringify(fabricObject))

			sendMessage({
				id : 'object:modified',
				//obj : JSON.stringify(fabricObject)                                    //check
				object : JSON.stringify(fabricObject)
			})

		}
	}

	canvas.on('object:modified', objectModified)
	canvas.on('text:changed', objectModified)

	// Change current colors to the selected object's.
	canvas.on('object:selected', function(e) {
		var fabricObject = e.target
		if(fabricObject.stroke) {
			_this.setStrokeColor(fabricObject.stroke)
		}
		if(fabricObject.fill) {
			if(fabricObject.type !== 'group') {
				_this.setFillColor(e.target.fill)
			} else {
				// Doesn't handle transparency, but ok for now.
				var color = new fabric.Color(e.target._objects[0].fill)
				_this.setFillColor('#' + color.toHex())
			}
		}
	})


	canvas.on('object:added', function(e) {

		//    if(storeMod == true)
		//      updateModifications(true);

		console.log('object added on canvas')

		if(!isRedoing){
			h = [];
		}

		isRedoing = false;



		var fabricObject = e.target
		if(!fabricObject.remote) {                                      //remote - added by some other peer

			//socket.emit('object:added', JSON.stringify(fabricObject))
			sendMessage({
				id : 'object:added',
				object : JSON.stringify(fabricObject)
			})

		}
		delete fabricObject.remote

	})

	canvas.on('object:removed', function(e) {
		// if(storeMod == true)
		//   updateModifications(true);

		var fabricObject = e.target
		console.log('object removed called');
//        socket.emit('object:removed', JSON.stringify(fabricObject))
		sendMessage({
			id : 'object:removed',
			object : JSON.stringify(fabricObject)
		});

	})

//    !-------------------

	// Handle keyboard events


	window.onkeyup = function(e) {
		var key = e.keyCode ? e.keyCode : e.which;
		var fabricObject = canvas.getActiveObject()
		if(!fabricObject) return null

		if (key === 46) {
			// `Delete` key removes a selected object.
			canvas.remove(fabricObject)
		} else if (key === 33) {
			// 'Page Up' adjusts z-index of selected object.
			canvas.bringForward(fabricObject)
			//socket.emit('canvas:bringForward', fabricObject.uuid)
			sendMessage({
				id : 'canvas:bringForward',
				uuid : fabricObject.uuid
			})

		} else if (key === 34) {
			// 'Page Down adjusts z-index of selected object.
			canvas.sendBackwards(fabricObject)
			//socket.emit('canvas:sendBackwards', fabricObject.uuid)

			sendMessage({
				id : 'canvas:sendBackwards',
				uuid : fabricObject.uuid
			})
		}

		e.preventDefault()
		return false
	}

    $('up').onclick = function() {
        var fabricObject = canvas.getActiveObject()
        if (!fabricObject) return null

        canvas.bringForward(fabricObject)
        //socket.emit('canvas:bringForward', fabricObject.uuid)
        sendMessage({
            id: 'canvas:bringForward',
            uuid: fabricObject.uuid

        })
    }


    $('down').onclick = function() {
        var fabricObject = canvas.getActiveObject()
        if (!fabricObject) return null


        canvas.sendBackwards(fabricObject)

        //socket.emit('canvas:bringForward', fabricObject.uuid)
        sendMessage({
            id: 'canvas:sendBackwards',
            uuid: fabricObject.uuid

        })
    }

    var isDown = false
	var line
	var prevX
	var prevY

	var bigLine

	function shapeDrawingOff(){
		// canvas.selection = true;
        //
		// canvas.forEachObject(function(o) {
		// 	o.selectable = true;
		// });
        //
		// canvas.isDrawingMode = true;
	}

    canvas.on('mouse:up',function (o) {



        //if we are in edit mode dont draw anything !!
        if(	$('drawing-mode').innerHTML =='Draw mode')
            return;												//#############


        // if(circleClick == true){
        //     var pointer = canvas.getPointer(o.e);
        //
        //     var fillColor = "rgba(0,0,0,0)";
        //
        //     if(filledShape){
        //         fillColor = $('fill-color').value ;
        //     }

        if(currentIcon == 'circle') {

            isDown = false;

// 			    var pointer = canvas.getPointer(o.e);
//
// 			    var fillColor = "rgba(0,0,0,0)";
//
// 			    if(filledShape){
// 			        fillColor = $('fill-color').value ;
//
// 				}
//
//
//             var circleObj = new fabric.Circle({
//                 radius: 20, left: pointer.x, top: pointer.y , fill: fillColor , stroke: $('stroke-color').value
//             });
//
//             canvas.add(circleObj);
//             circleClick = false;
//             //  canvas.isDrawingMode = true;
// //      canvas.selection = true;
//             shapeDrawingOff();
        }

        // if(rectangleClick == true){
        if(currentIcon == 'rectangle')		{			//#################
            isDown = false;



            //######################
            //shapeDrawingOff();
            // var pointer = canvas.getPointer(o.e);
            //
            // var fillColor = "rgba(0,0,0,0)";
            //
            // if(filledShape){
            //     fillColor = $('fill-color').value ;
            // }
            //
            // var rectObj = new fabric.Rect({
            //     left: pointer.x, top: pointer.y , width : 50 , height : 50 , fill: fillColor , stroke: $('stroke-color').value
            // })
            //
            // canvas.add(rectObj);
            // rectangleClick = false;
            // //canvas.isDrawingMode = true;
            // shapeDrawingOff();
        }

        // if(triangleClick == true){

        if(currentIcon == 'triangle'){
            isDown = false;
            // var pointer = canvas.getPointer(o.e);
            //
            // var fillColor = "rgba(0,0,0,0)";
            //
            // if(filledShape){
            //     fillColor = $('fill-color').value ;
            // }
            //
            //
            // var triangleObj = new fabric.Triangle({
            //     left: pointer.x, top: pointer.y , base : 50 , height : 50 , fill: fillColor , stroke: $('stroke-color').value
            // })
            //
            // canvas.add(triangleObj);
            // triangleClick = false;
            // //canvas.isDrawingMode = true;
            // shapeDrawingOff();
        }



        // if(textClick == true){

        if(currentIcon == 'text'){
            var pointer = canvas.getPointer(o.e);

            var textObject = new fabric.IText('', {
                fontFamily: 'arial black',
                //left: Math.random() * 1000,
                //top: Math.random() * 500,
                left: pointer.x,
                top: pointer.y,
                fill: $('fill-color').value,
            })

            canvas.add(textObject)
            textClick = false;
            //canvas.isDrawingMode = true;
            shapeDrawingOff();

            // changeMode();				//#################################

            // textObject.active = true;

            canvas.setActiveObject(textObject);		//#################
            textObject.enterEditing();

            textObject.selectable = false;

        }


        // if(rtd)
        if(currentIcon == 'rtd')
        {console.log('mouse up !!!');
            isDown = false;
            //    canvas.renderAll();
        }

        // if(lineClick == true){
        if(currentIcon == 'line'){

            isDown = false;
            lineClick = false;

            //canvas.isDrawingMode = true;
            shapeDrawingOff();

            //socket.emit('object:added', JSON.stringify(bigLine))

            bigLine.selectable = true;                                                  //NEW !!!!!!!!!!!!!!18 june

            /*
             sendMessage({
             id : 'object:added',
             object : JSON.stringify(bigLine)
             })
             */

//          bigLine.selectable = true;                                                  //NEW !!!!!!!!!!!!!!18 june

//          console.log('object modified locally');

            console.log(bigLine);

            var lineInfo = {

                x1 : bigLine.x1 ,
                x2 : bigLine.x2,
                y1 : bigLine.y1,
                y2 : bigLine.y2,
                left: bigLine.left,
                top : bigLine.top,
                color : bigLine.stroke,
                uuid : bigLine.uuid,
                originX : 'center',                                                    //changed 18june
                originY : 'center'

            }

            // socket.emit('bigLineAdded', lineInfo)
            sendMessage({
                id : "bigLineAddedRemotely",
                lineInfo : JSON.stringify(lineInfo)
            })

        }

    });

    canvas.on('mouse:down',function (o) {

        //if we are in edit mode dont draw anything !!
        if(	$('drawing-mode').innerHTML =='Draw mode')
            return;												//#############


        // if(rtd)
        if(currentIcon == 'rtd')
        {

            console.log('mouse down !!!');
            isDown = true;
            var pointer = canvas.getPointer(o.e);
            console.log(pointer.x + " and " + pointer.y)
            var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];

            prevX = pointer.x
            prevY = pointer.y

            line = new fabric.Line(points, {
                strokeWidth: 5,
                fill: $('fill-color').value,
                stroke: $('stroke-color').value,																			//###########
                originX: 'center',
                originY: 'center'

            });
            line.selectable = false;
            canvas.add(line);
        }


        // if(lineClick == true){
        if(currentIcon == 'line'){
            isDown = true;

            var pointer = canvas.getPointer(o.e);
            var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];

            bigLine = new fabric.Line(points, {
                strokeWidth: 5,
                fill: $('fill-color').value,
                stroke: $('stroke-color').value,
                originX: 'center',
                originY: 'center',
                left : pointer.x,                                                   //changed 18june
                top : pointer.y,
                originX : 'center',                                                 //changed 18june
                originY : 'center'

            });

            //dont send this line now. So we make its remote attribute true
            bigLine.remote = true;
            canvas.add(bigLine);


            /*
             var line1 = new fabric.Line([0, 0, 200, 10], {
             fill: 'red',
             stroke: 'red',
             strokeWidth: 2,
             hasControls: true,
             hasRotatingPoint: true,
             padding: 10,
             left: 200,
             top: 50,
             scaleX: 3,
             scaleY: 3
             });
             canvas.add(line1);

             */

        }


        /*
         isDown = true;

         var pointer = canvas.getPointer(o.e);

         ctx.beginPath();
         ctx.moveTo(pointer.x,pointer.y);
         */

        // if(rectangleClick)							//#############

        if(currentIcon == 'rectangle')
        {
            isDown = true;
            var pointer = canvas.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;
            rect = new fabric.Rect({
                left: origX,
                top: origY,
                originX: 'left',
                originY: 'top',
                width: pointer.x-origX,
                height: pointer.y-origY,
                angle: 0,
                fill: "rgba(0,0,0,0)",
                stroke : $('stroke-color').value,
                transparentCorners: false
            });
            canvas.add(rect);

        }

        if(currentIcon == 'circle'){

            isDown = true;
            var pointer = canvas.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;
            circle = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 1,
                fill: "rgba(0,0,0,0)",
                stroke : $('stroke-color').value,
            });
            canvas.add(circle);

        }

        if(currentIcon == 'triangle'){

            isDown = true;
            var pointer = canvas.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;

            triangle = new fabric.Triangle({
                left: pointer.x,
                top: pointer.y ,
                originX: 'left',
                originY: 'top',
                width : pointer.x - origX ,
                height : pointer.y-origY ,
                fill: "rgba(0,0,0,0)" ,
                stroke: $('stroke-color').value,
            })

            triangle.selectable = false;
            canvas.add(triangle);

        }





    });

    canvas.on('mouse:move',function (o) {

        //if we are in edit mode dont draw anything !!
        if(	$('drawing-mode').innerHTML =='Draw mode')
            return;												//#############



        // if(rtd)
        if(currentIcon == 'rtd')
        {
            console.log('mouse move !!!');
            if (!isDown) return;
            var pointer = canvas.getPointer(o.e);
            console.log(pointer.x + " and " + pointer.y)



            //line.set({ x2: pointer.x, y2: pointer.y });

            //  canvas.renderAll();

            var points = [ prevX, prevY, pointer.x, pointer.y ];

            line = new fabric.Line(points, {
                strokeWidth: 5,
                fill: $('fill-color').value,
                stroke: $('stroke-color').value,
                originX: 'center',
                originY: 'center'
            });
            canvas.add(line);

            line.selectable = false;


            prevX = pointer.x;
            prevY = pointer.y;

        }


        // if(lineClick){

        if(currentIcon == 'line'){
            if (!isDown) return;
            var pointer = canvas.getPointer(o.e);
            bigLine.set({ x2: pointer.x, y2: pointer.y });
            canvas.renderAll();


        }

        // if(rectangleClick == true){		//#################


        if(currentIcon == 'rectangle'){
            if (!isDown) return;
            var pointer = canvas.getPointer(o.e);

            if(origX>pointer.x){
                rect.set({ left: Math.abs(pointer.x) });
            }
            if(origY>pointer.y){
                rect.set({ top: Math.abs(pointer.y) });
            }

            rect.set({ width: Math.abs(origX - pointer.x) });
            rect.set({ height: Math.abs(origY - pointer.y) });


            canvas.renderAll();

            //	rect.trigger('modified');		//required to trigger modified event in canvas so that its sent to other peers

            canvas.trigger('object:modified' , {target : rect});		//###
        }

        if(currentIcon == 'circle'){

            if (!isDown) return;
            var pointer = canvas.getPointer(o.e);
            circle.set({ radius: Math.abs(origX - pointer.x) });
            canvas.renderAll();

            canvas.trigger('object:modified' , {target : circle});		//###

        }

        if(currentIcon == 'triangle'){
            if (!isDown) return;
            var pointer = canvas.getPointer(o.e);

            triangle.set({ width: Math.abs(origX - pointer.x) });
            triangle.set({ height: Math.abs(origY - pointer.y) });


            canvas.renderAll();

            canvas.trigger('object:modified' , {target : triangle});		//###

        }


    });

	/*
	 canvas.addEventListener('mousedown',function(event){
	 if(canDraw == true)
	 someDragEvent(event , 'mousedown');
	 });

	 canvas.addEventListener('mousemove',function(event){
	 if(canDraw == true)
	 someDragEvent(event , 'mousemove');
	 });

	 canvas.addEventListener('mouseup',function(event){
	 if(canDraw == true)
	 someDragEvent(event , 'mouseup');
	 });
	 */

	function someDragEvent(e , t){


		console.log('event called : ' + type + ' x: ' + x + " y:" + y );
		/*
		 var offset, type, x, y;
		 //    type = e.handleObj.type;
		 type = t;
		 //offset = $(this).offset();
		 //offset = canvas.offset();
		 //e.offsetX = e.layerX - offset.left;
		 //e.offsetY = e.layerY - offset.top;
		 e.offsetX = e.layerX - canvas.offsetLeft;
		 e.offsetY = e.layerY - canvas.offsetTop;
		 x = e.offsetX;
		 y = e.offsetY;
		 console.log('event called : ' + type + ' x: ' + x + " y:" + y );

		 draw(x, y, type , 1);

		 socket.emit('drawClick', {
		 x: x,
		 y: y,
		 type: type
		 });
		 */
	};

	var realTimeButton = document.getElementById('realTimeDrawing');

    realTimeButton.onclick = function(){

        //if real time drawing is on ..turn it off
        // if(rtd){
        //
        // if(currentIcon == 'rtd'){				//#########
        // 	$("insert-text").disabled = false;
        // 	$("insert-line").disabled = false;
        // 	$("insert-circle").disabled = false;
        // 	$("insert-rectangle").disabled = false;
        // 	$("insert-triangle").disabled = false;
        // 	$("undo").disabled = false;
        // 	$("redo").disabled = false;
        // 	$("save").disabled = false;
        // 	$('drawing-mode').disabled = false;
        // 	$('eraser').disabled = false;
        // 	$("drawing-mode-selector").disabled = false;
        //
        // 	canvas.selection = true;
        // 	canvas.isDrawingMode = true;
        //
        // 	canvas.forEachObject(function(o) {
        // 		o.selectable = true;
        // 	});
        //
        //
        // 	// rtd= false;				//##########check
        //
        // 	realTimeButton.innerHTML = 'enable'
        // }

        // else{
        //
        // 	$("insert-text").disabled = true;
        // 	$("insert-line").disabled = true;
        // 	$("insert-circle").disabled = true;
        // 	$("insert-rectangle").disabled = true;
        // 	$("insert-triangle").disabled = true;
        // 	$("undo").disabled = true;
        // 	$("redo").disabled = true;
        // 	$("save").disabled = true;
        // 	$('drawing-mode').disabled = true;
        // 	$('eraser').disabled = true;
        // 	$("drawing-mode-selector").disabled = true;


        canvas.isDrawingMode = false;
        canvas.selection = false;

        canvas.forEachObject(function(o) {
            o.selectable = false;
        });

        // rtd= true;


        if(currentIcon == 'eraser'){												//#################
            canvas.freeDrawingBrush.color = oldStroke;
        }

        currentIcon = 'rtd';				//######################
        changeBackgroundColor('realTimeDrawing');
        // realTimeButton.innerHTML = 'disable'
    }


    var eraserButton  = document.getElementById('eraserImage');								//#####################
    // var oldBrushType
//  var oldFill
    var oldColor


    eraserButton.onclick = function(){

        // if(eraserButton.innerHTML == 'enable')
        // $("insert-text").disabled = true;
        // $("insert-line").disabled = true;
        // $("insert-circle").disabled = true;
        // $("insert-rectangle").disabled = true;
        // $("insert-triangle").disabled = true;
        // $("realTimeDrawing").disabled = true;
        // $("undo").disabled = true;
        // $("redo").disabled = true;
        // $("save").disabled = true;
        // $('drawing-mode').disabled = true;


        console.log('inside here');
        // eraserMode = true;
        currentIcon = 'eraser';
        changeBackgroundColor('eraserImage');

        // oldBrushType = $('drawing-mode-selector').value;
        //oldFill = $('fill-color').value;
        oldColor = canvas.freeDrawingBrush.color;
        oldStroke = $('stroke-color').value;


        //_this.setFillColor('#FFFFFF')


        //      $('drawing-mode-selector').value = 'pencil';

        canvas.isDrawingMode = true;

        canvas.currentBrush = 'pencil';
        console.log('Switching brush to', canvas.currentBrush)
        canvas.freeDrawingBrush = app.brushes['pencil']
//            canvas.freeDrawingBrush.color = $('fill-color').value
        canvas.freeDrawingBrush.color = '#FFFFFF'
        canvas.freeDrawingBrush.width = parseInt($('drawing-line-width').value, 10) || 1

        //$('fill-color').value = '#FFFFFF';

        // eraserButton.innerHTML = 'disable'


// 		else{
// 			eraserMode = false;
// //      _this.setFillColor(oldFill)
//
// 			$("insert-text").disabled = false;
// 			$("insert-line").disabled = false;
// 			$("insert-circle").disabled = false;
// 			$("insert-rectangle").disabled = false;
// 			$("insert-triangle").disabled = false;
// 			$("realTimeDrawing").disabled = false;
// 			$("undo").disabled = false;
// 			$("redo").disabled = false;
// 			$("save").disabled = false;
// 			$('drawing-mode').disabled = false;
//
//
//
//
// 			//$('drawing-mode-selector').value = oldBrushType;
//
// 			canvas.currentBrush = oldBrushType
// 			console.log('Switching brush to', canvas.currentBrush)
// 			canvas.freeDrawingBrush = app.brushes[oldBrushType]
// //            canvas.freeDrawingBrush.color = $('fill-color').value
// 			canvas.freeDrawingBrush.color = oldColor;
// 			canvas.freeDrawingBrush.width = parseInt($('drawing-line-width').value, 10) || 1
//
// 			eraserButton.innerHTML = 'enable'
// 		}


    }

	var imageLoader = $('imgLoader');

    imageLoader.onchange = function handleImage(e) {

        //var isjpeg = /\.jpe?g$/i.test(e.target.files[0]);
        //var ispng = /\.png$/i.test(e.target.files[0]);

        //if (!isjpeg && !ispng) {
        //       alert('Only jpg or png files allowed!');
        //}

        //object of type File
        var file = e.target.files[0];
        console.log(file);

        if (!file.type.match('image.*')) {
            $('modalHeading').innerHTML = "Image Error";
            $('modalText').innerHTML = "Only Image Files allowed!";
            $('myModal').style.display = "block";
            // alert('Only image files allowed!');
        }

        else{

            var reader = new FileReader();

            reader.onload = function (event) {

                //     console.log('fdsf');
                var imgObj = new Image();
                imgObj.src = event.target.result;

                imgObj.onload = function () {
                    // start fabricJS stuff

                    console.log('loaded image');
                    var image = new fabric.Image(imgObj);

                    image.set({
                        left: 250,
                        top: 250,
                        padding: 10,
                        cornersize: 10
                    });
                    image.scale(0.3).setCoords();

                    canvas.add(image);
                    // image.selectable = false;
                    // end fabricJS stuff

                    canvas.isDrawingMode = false;
                    currentIcon = "none";
                    changeBackgroundColor("none");
                }

            }
            reader.readAsDataURL(e.target.files[0]);

        }

    }

	var undoButton = $('undo');
	var undoButtonEdit = $('undo_edit');
	var redoButton = $('redo');
	var redoButtonEdit = $('redo_edit');


	undoButton.onclick = undoButtonEdit.onclick = undo;
	redoButton.onclick = redoButtonEdit.onclick = redo;

	function undo(){

		if(canvas._objects.length>0){
			var obj = canvas._objects.pop()
			h.push(obj);
			console.log('in undo');

//    socket.emit('object:removed', JSON.stringify(obj))

			sendMessage({
				id : 'object:removed',
				object : JSON.stringify(obj)
			})

			canvas.renderAll();
		}
	}

	function redo(){

		if(h.length>0){
			isRedoing = true;
			canvas.add(h.pop());
		}
	}


	/*
	 function undo() {
	 if (mods < state.length) {
	 storeMod = false;
	 canvas.clear().renderAll();

	 canvas.loadFromJSON(state[state.length - 1 - mods - 1]);
	 canvas.renderAll();
	 storeMod = true;


	 //console.log("geladen " + (state.length-1-mods-1));
	 //console.log("state " + state.length);
	 mods += 1;
	 //console.log("mods " + mods);
	 }
	 }

	 function redo() {
	 if (mods > 0) {
	 canvas.clear().renderAll();
	 canvas.loadFromJSON(state[state.length - 1 - mods + 1]);
	 canvas.renderAll();
	 //console.log("geladen " + (state.length-1-mods+1));
	 mods -= 1;
	 //console.log("state " + state.length);
	 //console.log("mods " + mods);
	 }
	 }

	 clearcan = function clearcan() {
	 canvas.clear().renderAll();
	 newleft = 0;
	 }
	 */


	var saveButton = $('save')

	saveButton.onclick = function(){
		//socket.emit('canvasSavedState' , canvas.toDataURL());
		sendMessage({
			id : 'canvasSavedState',
			savedState : canvas.toDataURL()
		})
	}


	var download = $('download');
	var download_edit = $('download_edit');

	download.onclick = download_edit.onclick =  function(){


		var d = new Date,
			dformat = [d.getMonth()+1,
					d.getDate(),
					d.getFullYear()].join('-')+''+
				[d.getHours(),
					d.getMinutes(),
					d.getSeconds()].join(':');

		downloadCanvas(this,'myCanvas'+ dformat +'.png');
	}

	function downloadCanvas(link, filename) {
		console.log('link is : ' + this);
		link.href = canvas.toDataURL();
		link.download = filename;
	}


}

/*
 function updateModifications(savehistory) {
 if (savehistory === true) {
 myjson = JSON.stringify(canvas);
 state.push(myjson);
 }
 }
 */







var _this = this

fabric.Canvas.prototype.getObjectByUUID = function(uuid) {
	var object = null
	var objects = this.getObjects()

	console.log('i am in getObjectByUUID and size of objects is : ' + this.size())
	console.log(this);
	console.log('required object has uuid : ' + uuid)

	for (var i = 0, len = this.size(); i < len; i++) {
		console.log('uuid of current object is : ' + objects[i].uuid)
		if (objects[i].uuid && objects[i].uuid === uuid) {
			object = objects[i]
			break
		}
	}

	return object
}

fabric.Object.prototype.toObject = (function(toObject) {
	return function(propertiesToInclude) {
		propertiesToInclude = (propertiesToInclude || []).concat(['uuid', 'day'])
		return toObject.apply(this, [propertiesToInclude])
	};
})(fabric.Object.prototype.toObject)


fabric.Object.prototype.setOptions = (function(setOptions) {
	return function(options) {
		setOptions.apply(this, [options])
		this.uuid = this.uuid || _this.uuidGen()
		this.day = app.dayOftheWeek
	}
})(fabric.Object.prototype.setOptions)


uuidGen = function() {
	return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
		return v.toString(16)
	})
}

document.addEventListener('DOMContentLoaded', function(event) {
	console.log('DOMContentLoaded');
	app.init()
})
//!!!!!!!!!!!!!!!!!!!!!!!!e

changeBackgroundColor = function (icon){

    $('insert-text').style.background = '#ffffff';
    $('insert-circle').style.background = '#ffffff';
    $('insert-rectangle').style.background = '#ffffff';
    $('insert-triangle').style.background = '#ffffff';
    $('insert-line').style.background = '#ffffff';
    $('eraserImage').style.background = '#ffffff';
    $('free-drawing').style.background = '#ffffff';
    $('realTimeDrawing').style.background = '#ffffff';

    if( !(icon == 'none') )
        $(icon).style.background = '#03a9f4';

}






