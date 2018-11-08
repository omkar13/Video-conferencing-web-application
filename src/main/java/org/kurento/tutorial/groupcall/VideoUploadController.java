package org.kurento.tutorial.groupcall;

/**
 * Created by yash on 28/6/16.
 */

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.awt.*;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;

@RestController
public class VideoUploadController {
    private static final Logger log = LoggerFactory.getLogger(CallHandler.class);

    @RequestMapping(method = RequestMethod.POST, value = "/videoupload")
    public String handleFileUpload(@RequestParam("name") String name,
                                   @RequestParam("file") MultipartFile file,
                                   @RequestParam("roomname") String roomname,
                                   @RequestParam("username") String username) {


        log.info("handle file upload called !!!!!!!!!!!!");
        File f=null;

        if (!file.isEmpty()) {
            try {
                log.info("i am here");

                //create a directory beside index.html in target folder to store the ppt images in server.
                File dir = new File("target/classes/static/videos/" + roomname + "/" + username);

                boolean b = dir.mkdirs();

                log.info("mkdirs returned : "  + b);

               f = new File("target/classes/static/videos/" + roomname + "/" + username + "/" + name);

                BufferedOutputStream stream = new BufferedOutputStream(
                        new FileOutputStream(f));

                FileCopyUtils.copy(file.getInputStream(), stream);
                stream.close();
                log.info("file is uploaded. Its address is : " + f.getAbsolutePath());

            } catch (Exception e) {
                log.info("exception raised : " + e.getMessage());
            }
        } else {
            log.info("file not uploaded as it was empty");
            return "";
        }

        return "/videos/" + roomname + "/" + username + "/" + name;

    }

}
