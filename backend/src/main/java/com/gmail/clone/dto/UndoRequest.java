package com.gmail.clone.dto;

import lombok.Data;

@Data
public class UndoRequest {
    private String actionType; // "DELETE", "SEND", "ARCHIVE"
    private Long emailId;
}
