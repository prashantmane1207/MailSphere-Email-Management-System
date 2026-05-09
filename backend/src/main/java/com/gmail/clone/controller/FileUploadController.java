package com.gmail.clone.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
public class FileUploadController {

    private static final String UPLOAD_DIR = "uploads/";

    public FileUploadController() {
        File directory = new File(UPLOAD_DIR);
        if (!directory.exists()) {
            directory.mkdirs();
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFiles(@RequestParam("files") MultipartFile[] files) {
        try {
            List<String> fileUrls = new ArrayList<>();
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;

                // Generate a unique file name
                String originalFilename = file.getOriginalFilename();
                String uniqueFilename = UUID.randomUUID().toString() + "_" + originalFilename;
                
                // Save the file
                Path path = Paths.get(UPLOAD_DIR + uniqueFilename);
                Files.write(path, file.getBytes());
                
                // Return download URL
                fileUrls.add("/api/files/download/" + uniqueFilename);
            }
            return ResponseEntity.ok(fileUrls);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Could not store files: " + e.getMessage());
        }
    }

    @GetMapping("/download/{filename}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadFile(@PathVariable String filename) {
        try {
            Path file = Paths.get(UPLOAD_DIR).resolve(filename);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}