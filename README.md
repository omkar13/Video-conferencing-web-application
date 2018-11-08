# Video-conferencing-web-application
* Developed a WebRTC enabled multi-party video conferencing and web chat application
* Enhanced app by adding collaborative drawing canvas, presentation sharing and video sharing.
* Optimized application for low-bandwidth scenarios by providing an optional audio stream only toggle.

Please refer to the project report pdf file for detailed summary.

Features:
* User Registry – Maintains a list of registered users in our database and allows
only those users to use our application.
* Dynamic Rooms – The rooms are created dynamically giving users the freedom
to name the rooms according to their choice.
* Video conferencing - Supports live video conferencing for multiple rooms at the same time
Canvas sahring - Real-time whiteboard sharing with one controller (who can be changed)
* Public Chat – It is a common per-room chat where the user can type a message
which will be sent to all the members of the room.
* Private Chat – It is a chat between any two users of the room which is exclusive
to them.
* Presentation sharing - Real-time presentation sharing functionality
Video streaming and sharing - Real-time video streaming and sharing 

User types:
* General user - The participant in the meeting. Can view videos of other users, view canvas, view presentations and participate in chats. Can be converted into a controller by the administrator.
* Administrator – The creator of the room is known as the administrator. Holds
various powers like granting control to other users, muting other users and ending
the meeting.
* Controller – The user who has the rights to present a presentation, stream a local
video or draw on the canvas is known as the controller.

Modes: 
* Videos Mode – Displays the video stream from the cameras of all the other
meeting participants.
* Canvas Mode – Allows the current controller to add, manipulate and delete
objects on the canvas which will be visible to all the other users.
Page 4NG-I2I, Real Time Communication with WebRTC
* Presentation Mode - Allows the current controller to present a presentation
which will be visible to all the other users.
* Video Stream Mode – Allows the current controller to stream a locally stored
video file to al the other users in addition to his camera stream.

Specifications:
* Application development framework: Spring (Java)
* Front end code: Javascript, AJAX, WebRTC, websockets, Apache POI, Kurento client APIs, Material design, Fabric.js

Running:
* Backend code entry point: GroupCallApp.java
* Client code entry point: index.html

References:
* Kurento official site -https://www.kurento.org/
* https://webrtc.org/
* Fabric js - http://fabricjs.com/docs/fabric.Canvas.html
* The noun project icons -https://thenounproject.com/
* Presentation ppt to png images-
http://www.tutorialspoint.com/apache_poi_ppt/apache_poi_ppt_to_image.htm
* CSS styling - http://www.w3schools.com/w3css/
* www.html5rocks.com/en/tutorials/webrtc/basics/

Contributions:
This work was done during my summer internship at the Indian Institute of Technology Bombay in 2016.
Development contributors: Omkar Damle (Currently at the New York University), Yash Trivedi (Currently at the University of Wisconsin Madison), Rishabh Verma (Currently at Oracle)
Principal Investigator: Prof. D.B. Phatak
Project In-charge: Mr. Rahul Deshmukh
Project Mentor: Mr. Harish Satpute