package com.gmail.clone.dto;

import lombok.Data;

@Data
public class ForgotPasswordRequest {
    private String email;
    private String newPassword;
}
