package com.gmail.clone.dto;

import lombok.Data;

@Data
public class AttachmentDto {
    private String filename;
    private String fileType;
    private long size;
    private String data;
}
