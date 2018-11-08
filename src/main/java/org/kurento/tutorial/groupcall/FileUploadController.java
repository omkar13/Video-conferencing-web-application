package org.kurento.tutorial.groupcall;

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

import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;



//dont use controller instead use a rest controller. refer http://stackoverflow.com/questions/27113452/circular-view-path-in-a-simple-spring-boot-project-with-a-controller

@RestController
public class FileUploadController {

//    private static final Logger log = LoggerFactory.getLogger(CallHandler.class);
//
//    @RequestMapping(method = RequestMethod.POST, value = "/")
//    public String handleFileUpload(@RequestParam("name") String name,
//                                   @RequestParam("file") MultipartFile file,
//                                   RedirectAttributes redirectAttributes) {
//
//        log.info("handle file upload called !!!!!!!!!!!!1");
//        log.info("name : " + name);
//
//        if (name.contains("/")) {
//            redirectAttributes.addFlashAttribute("message", "Folder separators not allowed");
//            return "redirect:/";
//        }
//        if (name.contains("/")) {
//            redirectAttributes.addFlashAttribute("message", "Relative pathnames not allowed");
//            return "redirect:/";
//        }
//
//        if (!file.isEmpty()) {
//            try {
//                log.info("i am here");
//
//                BufferedOutputStream stream = new BufferedOutputStream(
//                        new FileOutputStream(new File("/" + name)));
//
//                FileCopyUtils.copy(file.getInputStream(), stream);
//                stream.close();
//                log.info("file is uploaded");
//                redirectAttributes.addFlashAttribute("message",
//                        "You successfully uploaded " + name + "!");
//            }
//            catch (Exception e) {
//                redirectAttributes.addFlashAttribute("message",
//                        "You failed to upload " + name + " => " + e.getMessage());
//            }
//        }
//        else {
//            redirectAttributes.addFlashAttribute("message",
//                    "You failed to upload " + name + " because the file was empty");
//        }
//
//        return "redirect:/";
//    }


    private static final Logger log = LoggerFactory.getLogger(CallHandler.class);


    @RequestMapping(method = RequestMethod.POST, value = "/presentation")
    public String handleFileUpload(@RequestParam("name") String name,
                                   @RequestParam("file") MultipartFile file,
                                   @RequestParam("roomname") String roomname,
                                   @RequestParam("username") String username) {


        log.info("handle file upload called !!!!!!!!!!!!1");

        int noOfSlides = 0  ;

        if (!file.isEmpty()) {
            try {
                log.info("i am here");

                //create a directory beside index.html in target folder to store the ppt images in server.
                File dir = new File("target/classes/static/ppt_images/" + roomname + "/" + username);

                boolean b = dir.mkdirs();

                log.info("mkdirs returned : "  + b);


                File f = new File("target/classes/static/ppt_images/" + roomname + "/" + username + "/" + name);

                BufferedOutputStream stream = new BufferedOutputStream(
                        new FileOutputStream(f));



                FileCopyUtils.copy(file.getInputStream(), stream);
                stream.close();
                log.info("file is uploaded. Its address is : " + f.getAbsolutePath());

                noOfSlides = convertPPTToPNG(f , roomname , username);

            } catch (Exception e) {
                log.info("exception raised : " + e.getMessage());
            }
        } else {
            log.info("file not uploaded as it was empty");
        }


        return Integer.toString(noOfSlides);
    }

    private int convertPPTToPNG(File file , String roomname,String username){

        int noOfSlides = 0;

        try {




            XMLSlideShow ppt = new XMLSlideShow(new FileInputStream(file));

            //getting the dimensions and size of the slide
            Dimension pgsize = ppt.getPageSize();
//            XSLFSlide[] slide = ppt.getSlides();

            java.util.List<XSLFSlide> slideList = ppt.getSlides();

            BufferedImage img = null;

            noOfSlides = slideList.size();

            for (int i = 0; i < slideList.size(); i++) {

                log.info("height : " + pgsize.getHeight() + "width: " + pgsize.getWidth());

                img = new BufferedImage(pgsize.width, pgsize.height, BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = img.createGraphics();

                //clear the drawing area
                graphics.setPaint(Color.white);
                graphics.fill(new Rectangle2D.Float(0, 0, pgsize.width, pgsize.height));

                //render
                slideList.get(i).draw(graphics);


                //creating an image file as output


//                log.info("user.dir : " + System.getProperty("user.dir"));


                FileOutputStream out = new FileOutputStream("target/classes/static/ppt_images/" + roomname +"/" + username  + "/ppt_image" + Integer.toString(i) + ".png");


                javax.imageio.ImageIO.write(img, "png", out);
                ppt.write(out);

                System.out.println("Image " + Integer.toString(i)+ " successfully created");
                out.close();
            }
        }
        catch (Exception e){
            log.info("exception raised: " + e.getMessage());
        }

        return noOfSlides;

    }

}


