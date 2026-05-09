package com.gmail.clone.dto;

import lombok.Data;
import java.util.List;

@Data
public class SendMailRequest {
    private String receiverEmail;
    private String subject;
    private String description;
    private boolean draft;
    private List<AttachmentDto> attachments;
    private java.time.LocalDateTime scheduledTime;
    private String language;
    private String category;
}
