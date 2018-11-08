package org.kurento.tutorial.groupcall;

import java.awt.image.BufferedImage;
import java.awt.image.PackedColorModel;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.sql.*;
import java.text.SimpleDateFormat;
import java.util.Collection;
import java.util.Date;

import com.google.gson.JsonArray;
import org.kurento.client.IceCandidate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;

import javax.imageio.ImageIO;
import javax.xml.bind.DatatypeConverter;

public class CallHandler extends TextWebSocketHandler {

  private static final Logger log = LoggerFactory.getLogger(CallHandler.class);

  private static final Gson gson = new GsonBuilder().create();

  Connection conn = null;
  Statement statement = null;

  @Autowired
  private RoomManager roomManager;

  @Autowired
  private UserRegistry registry;

  @Override
  public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    final JsonObject jsonMessage = gson.fromJson(message.getPayload(), JsonObject.class);

    final UserSession user = registry.getBySession(session);

    if (user != null) {
      log.debug("Incoming message from user '{}': {}", user.getName(), jsonMessage);
    } else {
      log.debug("Incoming message from new user: {}", jsonMessage);
    }

    switch (jsonMessage.get("id").getAsString()) {
      case "joinRoom":
        JsonObject jsonObject = new JsonObject();
        if(!validateUser(jsonMessage)) {
          jsonObject.addProperty("id" , "registrationFailed");
//          user.sendMessage(jsonObject);
          synchronized (session) {
            session.sendMessage(new TextMessage(jsonObject.toString()));
          }
          break;
        }
        System.out.println("Outside False Condition!");
        jsonObject.addProperty("id" , "registrationSuccess");
        synchronized (session) {
          session.sendMessage(new TextMessage(jsonObject.toString()));
        }
        joinRoom(jsonMessage, session);
        sendRoomMessagesTo( registry.getByName( jsonMessage.get("name").getAsString() ) );
        break;
      case "receiveVideoFrom":
        final String senderName = jsonMessage.get("sender").getAsString();
        final UserSession sender = registry.getByName(senderName);
        final String sdpOffer = jsonMessage.get("sdpOffer").getAsString();
        user.receiveVideoFrom(sender, sdpOffer);
        break;
      case "leaveRoom":
        leaveRoom(user);
        break;
      case "onIceCandidate":
        JsonObject candidate = jsonMessage.get("candidate").getAsJsonObject();
        if (user != null) {
          IceCandidate cand = new IceCandidate(candidate.get("candidate").getAsString(),
                  candidate.get("sdpMid").getAsString(), candidate.get("sdpMLineIndex").getAsInt());
          user.addCandidate(cand, jsonMessage.get("name").getAsString());
        }
        break;
      case "showCanvas":
        sendToAllInRoom(user, jsonMessage);
        break;
      case "showPresentation":
        sendToAllInRoom(user, jsonMessage);
        break;
      case "showVideoStream":
        sendToAllInRoom(user, jsonMessage);
        break;
      case "cancelVideo":
        final String request_from = jsonMessage.get("sender").getAsString();
        final String cancel_of = jsonMessage.get("of").getAsString();
        UserSession prtcpnt = registry.getByName(request_from);
        prtcpnt.cancelVideoFrom(cancel_of);
        break;
      case "publicChat":
        //omkar function
        sendToAllInRoom(user,jsonMessage);
        try {
          String user_name = user.getName();
          saveMsg(user_name , user.getRoomName(), jsonMessage.get("message").getAsString());
        }catch (NullPointerException e){
          System.out.println("Sender message is null!!");
        }
        break;
      case "privateChat":
        final String receiver = jsonMessage.get("receiver").getAsString();
        final UserSession receiver_session = registry.getByName(receiver);
        receiver_session.sendMessage(jsonMessage);
        break;
      case "object:added":
//        log.info("object added by someone");
      case "object:modified":
      case "object:removed":
      case "canvas:clear":
      case "canvas:bringForward":
      case "canvas:sendBackwards":
      case "bigLineAddedRemotely":
      case "changeSlide":                           //NEw////////////////////////
       if(user == roomManager.getRoom(user.getRoomName()).getController())
        sendToAllInRoom(user, jsonMessage);
        break;

      case "startppt":
        sendToAllInRoom(user, jsonMessage);
        break;
      case "receiveCurrentState":
        onReceiveCurrentState(jsonMessage.getAsJsonArray("objectsArray"),jsonMessage.get("forNewUser").getAsString());
        break;
      case "canvasSavedState":
        onSaveCanvasState(jsonMessage.get("savedState").getAsString());
        break;
        case "muteAudio":
            if(user == roomManager.getRoom(user.getRoomName()).getAdmin())
                sendToAllInRoom(user, jsonMessage);
            break;
        case "unmuteAudio":
            if(user == roomManager.getRoom(user.getRoomName()).getAdmin())
                sendToAllInRoom(user, jsonMessage);
            break;
        case "makeController":
            Room rm_cnt =roomManager.getRoom(user.getRoomName());
            if(user == rm_cnt.getAdmin()){
                rm_cnt.setController( registry.getByName(jsonMessage.get("newController").getAsString() ) );
                actuallySendToAllInRoom(user, jsonMessage);
            }
            break;
      case "videoPresentMode":
        actuallySendToAllInRoom(user,jsonMessage);
        break;
      default:
        break;
    }
  }

  private boolean validateUser(JsonObject params) {
    String username = params.get("name").getAsString();
    String password = params.get("password").getAsString();

    System.out.println("U: " + username + " P: " + password);
    boolean returnVal = false;
    try {
      Class.forName("com.mysql.jdbc.Driver").newInstance();
      conn =
              DriverManager.getConnection("jdbc:mysql://localhost/kurento?" +
                      "user=root&password=yashMYSQL21");

      Statement statement = conn.createStatement();
      String sql = "SELECT password FROM users WHERE username = '" + username + "'";
      System.out.println("The formed query is: " + sql);
      ResultSet rs = statement.executeQuery(sql);

      while (rs.next()) {
        String dbPassword = rs.getString("password");
        System.out.println("DB Pass: " + dbPassword);
        if(dbPassword.toString().equals(password.toString())) {
          returnVal = true;
          break;
        }
        System.out.println("Executed once!\n");
      }

    } catch(SQLException ex) {
        System.out.println("SQLException: " + ex.getMessage());
        System.out.println("SQLState: " + ex.getSQLState());
        System.out.println("VendorError: " + ex.getErrorCode());
    } catch (Exception ex) {
      System.out.println("Exception: " + ex.getMessage() + ex.toString());
    } finally {

      try {
        if (statement != null)
          conn.close();
      } catch (SQLException se) {
        System.out.println(se.toString());
      }

      try {
        if (conn != null)
          conn.close();
      } catch (SQLException se) {
        se.printStackTrace();
      }
    }
    System.out.println("The return value is: " + returnVal);
    return returnVal;
  }

  private void saveMsg(String userName,String roomName,String msg) {
    Room room = roomManager.getRoom(roomName);
    JsonObject messageObj = new JsonObject();
    messageObj.addProperty("sender",userName);
    messageObj.addProperty("message",msg);
    room.roomMsg.add(messageObj);
  }

  ///////////////   With join room
  public void sendRoomMessagesTo(UserSession user) throws IOException {
    Room room = roomManager.getRoom(user.getRoomName());
    Date currentDate = new Date();
    JsonObject mainObj = new JsonObject();
    mainObj.addProperty("id", "previousPublicChat");
    mainObj.addProperty("startTime", currentDate.getTime() - room.getCreationTime().getTime());
    mainObj.addProperty("currentAdmin", room.getAdmin().getName());
      mainObj.addProperty("currentController", room.getController().getName());
    mainObj.add("list", room.roomMsg);
    user.sendMessage(mainObj);
 }

  private void sendToAllInRoom(UserSession user, JsonObject jsonMessage){

    log.info("sending something to all in room which was sent by {}" , user.getName());
    final Room room = roomManager.getRoom(user.getRoomName());

    Collection<UserSession> roommates = room.getParticipants() ;

    log.info("roomname : " + user.getRoomName());
    log.info("roommates : " + roommates.toString());
    log.info("no of people in room : " + Integer.toString(roommates.size()));

    for (final UserSession participant : roommates) {

      log.info("participant : " + participant.getName());

      if (!(participant.getName() == user.getName()))

      {
        try {
          log.info("sending message to {}" + participant.getName());
          participant.sendMessage(jsonMessage);
        } catch (final IOException e) {
          System.out.println(participant.getName() + "has not notified about the message sent by " + user.getName());
          //   unnotifiedParticipants.add(participant.getName());
        }

      }

    }
  }


    private void actuallySendToAllInRoom(UserSession user, JsonObject jsonMessage){

        log.info("sending something to all in room which was sent by {}" , user.getName());
        final Room room = roomManager.getRoom(user.getRoomName());

        Collection<UserSession> roommates = room.getParticipants() ;

        log.info("roomname : " + user.getRoomName());
        log.info("roommates : " + roommates.toString());
        log.info("no of people in room : " + Integer.toString(roommates.size()));

        for (final UserSession participant : roommates) {

            log.info("participant : " + participant.getName());

//            if (!(participant.getName() == user.getName()))


                try {
                    log.info("sending message to {}" + participant.getName());
                    participant.sendMessage(jsonMessage);
                } catch (final IOException e) {
                    System.out.println(participant.getName() + "has not notified about the message sent by " + user.getName());
                    //   unnotifiedParticipants.add(participant.getName());
                }



        }
    }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {

    log.info("afterConnectionClosed called in CallHandler");                            //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    if(session == null) {
      return;
    }
    UserSession user = registry.removeBySession(session);
    if(user==null)
      return ;
    System.out.println(user.toString());
    String roomName=user.getRoomName();
    if(roomManager.roomExists(roomName)){
      System.out.println(roomManager.getRoom(user.getRoomName()).getParticipants().toString());
      roomManager.getRoom(roomName).leave(user);
    }
  }

  private void joinRoom(JsonObject params, WebSocketSession session)  {
    final String roomName = params.get("room").getAsString();
    final String name = params.get("name").getAsString();
    log.info("PARTICIPANT {}: trying to join room {}", name, roomName);


    Room room = roomManager.getRoom(roomName);


    try {
      final UserSession user = room.join(name, session);

        /////////////  this make 1st one ADMIN
        if(room.getAdmin() == null) {
            room.setAdmin(user);
        }
        if(room.getController() == null) {
            room.setController(user);
        }
      registry.register(user);
    }
    catch (java.io.IOException e){
      log.info("IOException caught : " + e);
    }



    if(room.getParticipants().size()>1){
      log.info("room is not empty. Tell some old user to send current canvas state");

      log.info(room.getParticipants().toArray().toString());

      UserSession userSession = (UserSession) room.getParticipants().toArray()[0];

      if(userSession.getName() == name) {
        userSession = (UserSession) room.getParticipants().toArray()[1];
      }

      log.info("old user : " + userSession.getName());


      JsonObject jsonObject = new JsonObject();
      jsonObject.addProperty("id" , "sendCurrentState");
      jsonObject.addProperty("forNewUser", name);

      try {
        userSession.sendMessage(jsonObject);
      }
      catch (java.io.IOException e){
        log.info("IOException caught while sending message: " + e);
      }
    }
  }


  private void leaveRoom(UserSession user) throws IOException {
    final Room room = roomManager.getRoom(user.getRoomName());
    if(user == room.getAdmin()) {
      JsonObject jsonObject = new JsonObject();
      jsonObject.addProperty("id" , "adminLeft");
      sendToAllInRoom(user, jsonObject);

      log.info("admin is leaving ! Save the ppts");

      File source = new File("target/classes/static/ppt_images/" + user.getRoomName());

      Date date = new Date();
      SimpleDateFormat sdf = new SimpleDateFormat("_dd_MM_yyyy_HH:mm:ss");
      String formattedDate = sdf.format(date);

//      File dir = new File("target/saved_ppts/" + user.getRoomName() + formattedDate);

      File dir = new File("target/saved_ppts");


      boolean b = dir.mkdirs();

      log.info("Inside leaveRoom, mkdirs returned : "  + b);


      File destination = new File("target/saved_ppts/" + user.getRoomName() + formattedDate);

      if (!destination.exists()) {
        source.renameTo(destination);
      }
    }
    room.leave(user);
    if (room.getParticipants().isEmpty()) {
      roomManager.removeRoom(room);
    }
  }


  private void onReceiveCurrentState(JsonArray JSONobjects , String username)  throws IOException{
    //the first user has given the current state(in form of JSON array of objects). Now send it to all new users.
    // socket.on('receiveCurrentState', function(objects) {

    //      currentUsers.forEach(function(id) {

//  objects.forEach(function(item) {

//    var pathObj = JSON.parse(item);
    //io.sockets.socket(id).emit('object:added', pathObj);
//    io.to(id).emit('object:added', pathObj);

//  })

    //    })

    //  currentUsers =[];        //possible bug if a user connects while array is running..check later

    UserSession userSession = registry.getByName(username);

    for (int i = 0; i < JSONobjects.size(); i++) {
      log.info("OBJECT ADDED : " + JSONobjects.get(i));

      JsonObject jsonObject = new JsonObject();
      jsonObject.addProperty("id" , "object:added");
      jsonObject.add("object", JSONobjects.get(i));
      userSession.sendMessage(jsonObject);
    }

  }



  private void onSaveCanvasState(String dataURL){

    try{

      log.info("the data URL is : " + dataURL);
      // remove data:image/png;base64, and then take rest sting
//      String img64 = "64 base image data here";

      String img64 = dataURL.substring(22);
      log.info("taking substring:" + img64);

      byte[] decodedBytes = DatatypeConverter.parseBase64Binary(img64);
      BufferedImage bfi = ImageIO.read(new ByteArrayInputStream(decodedBytes));

      SimpleDateFormat sdfDate = new SimpleDateFormat("yyyy-MM-dd_HH:mm:ss");
      Date now = new Date();
      String strDate = sdfDate.format(now);

//      String filePath = "/SavedCanvasImages/image" + strDate + ".png";
      String filePath = "image" + strDate + ".png";

      File outputfile = new File(filePath);
      ImageIO.write(bfi , "png", outputfile);
      bfi.flush();
    }
    catch(Exception e)
    {
      log.info("exception: " + e);
      //Implement exception code
    }

  }

}