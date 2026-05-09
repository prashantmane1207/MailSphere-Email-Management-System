package com.gmail.clone.dto;

import lombok.Data;

@Data
public class TranslateRequest {
    private String text;
    private String targetLanguage;
}
