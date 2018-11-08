const PARTICIPANT_MAIN_CLASS = 'participant main';
const PARTICIPANT_CLASS = 'participant';

function Participant(name) {
	this.name = name;
	var container = document.createElement('div');
	container.style.display="inline-block";
	container.id = name;
	container.className = "w3-border w3-light-grey w3-card-4 w3-hover-opacity w3-margin";
	//container.className = isPresentMainParticipant() ? PARTICIPANT_CLASS : PARTICIPANT_MAIN_CLASS;
	
	var span = document.createElement('div');
	// span.style.fontSize="14px";
	// span.style.textAlign="center";
	// span.style.color="white";
	span.style.display="block";
	span.className="w3-container w3-indigo w3-hover-deep-orange w3-center";

	var video = document.createElement('video');
	var audio = document.createElement('audio');
	var rtcPeer;

	//container.onclick = switchContainerClass;
	span.appendChild(document.createTextNode(name));

	video.id = 'video-' + name;
	video.autoplay = true;
	video.controls = true;
	video.class = "video-item";
	// video.height= 120;
	// video.width = 160;
	video.height= window.innerWidth * (2.5/12) * 0.75;
	video.width = window.innerWidth * (2.5/12);

	video.onclick = function () {
		var bigVideoDiv = document.getElementById('videoBigDiv');
		var bigVideo = document.getElementById('bigVideo');
		console.log('Video Onclick Called!');
		bigVideo.src = video.src;
		bigVideoDiv.style.display = "inline-block";
		document.getElementById('bigVideoUserName').innerHTML = name;
	}


	audio.id = 'audio-' + name;
	audio.autoplay = true;
	audio.controls = false;

    var buttonsDiv = document.createElement('div');
    buttonsDiv.id="forAdminOnly"+name;
    buttonsDiv.style.display = "none";
    buttonsDiv.className = "w3-center w3-container";

	var muteButton = '<img title="Unmute" style="width: 30px;" src="unmute.png" id="muteButton'+name+'" name="' + name + '" onclick="muteUser(this);" class="w3-tiny w3-margin-right w3-light-blue w3-hover-opacity"/>';
	var unmuteButton = '<img title="Mute" style="display:none; width: 30px;" src="mute.png" id="unmuteButton'+name+'" name="' + name + '" onclick="unmuteUser(this);" class="w3-tiny w3-margin-right w3-light-blue w3-hover-opacity"/>';


	var makeControllerButton = '<img title="" style="width: 30px;" src="admin.png" id="makeControllerButton'+name+'" name="' + name + '" onclick="makeController(this);" class="w3-tiny w3-margin-right w3-light-blue w3-hover-opacity"/>';
	var currentControllerSpan = '<span title="" style="display: none;" id="currentControllerSpan'+name+'" name="' + name+ '" class="w3-tiny w3-margin-right w3-red w3-btn">Current Controller</span>';

    buttonsDiv.innerHTML += muteButton;
    buttonsDiv.innerHTML += unmuteButton;
    buttonsDiv.innerHTML += makeControllerButton;
    buttonsDiv.innerHTML += currentControllerSpan;

	container.appendChild(video);
	container.appendChild(audio);
	container.appendChild(span);
    container.appendChild(buttonsDiv);

	document.getElementById('videos').appendChild(container);

	this.getElement = function() {
		return container;
	}

	this.getVideoElement = function() {
		return video;
	}

	this.getAudioElement = function() {
		return audio;
	}

	function switchContainerClass() {
		if (container.className === PARTICIPANT_CLASS) {
			var elements = Array.prototype.slice.call(document.getElementsByClassName(PARTICIPANT_MAIN_CLASS));
			elements.forEach(function(item) {
				item.className = PARTICIPANT_CLASS;
			});

			container.className = PARTICIPANT_MAIN_CLASS;
		} else {
			container.className = PARTICIPANT_CLASS;
		}
	}

	function isPresentMainParticipant() {
		return ((document.getElementsByClassName(PARTICIPANT_MAIN_CLASS)).length != 0);
	}

	this.offerToReceiveVideo = function(error, offerSdp, wp){
		if (error) return console.error ("sdp offer error")
		console.log('Invoking SDP offer callback function');
        offerSdp = setBandwidth(offerSdp);
        var msg =  { id : "receiveVideoFrom",
			sender : name,
			sdpOffer : offerSdp
		};
		sendMessage(msg);
	}


	this.onIceCandidate = function (candidate, wp) {
		console.log("Local candidate" + JSON.stringify(candidate));

		var message = {
			id: 'onIceCandidate',
			candidate: candidate,
			name: name
		};
		sendMessage(message);
	}

	Object.defineProperty(this, 'rtcPeer', { writable: true});

	this.dispose = function() {
		console.log('Disposing participant ' + this.name);
		this.rtcPeer.dispose();
		container.parentNode.removeChild(container);
	};

    var audioBandwidth = 50;
    var videoBandwidth = 256;
    function setBandwidth(sdp) {
        // sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + audioBandwidth + '\r\n');
        // sdp	 = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + videoBandwidth + '\r\n');
         return sdp;
    }
}