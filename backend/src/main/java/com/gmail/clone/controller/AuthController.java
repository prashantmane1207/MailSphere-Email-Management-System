package com.gmail.clone.controller;

import com.gmail.clone.dto.AuthRequest;
import com.gmail.clone.dto.ForgotPasswordRequest;
import com.gmail.clone.dto.RegistrationOtpRequest;
import com.gmail.clone.dto.RegisterRequest;
import com.gmail.clone.entity.User;
import com.gmail.clone.exception.DuplicateEmailException;
import com.gmail.clone.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            User user = authService.register(request);
            return ResponseEntity.ok(user);
        } catch (DuplicateEmailException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", e.getMessage(),
                    "suggestions", e.getSuggestions()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            Object response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<?> setup2FA(@RequestHeader("userId") Long userId) {
        try {
            return ResponseEntity.ok(authService.setup2FA(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2FA(@RequestHeader("userId") Long userId, @RequestBody Map<String, Integer> request) {
        try {
            boolean isValid = authService.verify2FA(userId, request.get("code"));
            if (isValid) return ResponseEntity.ok(Map.of("message", "2FA enabled successfully"));
            else return ResponseEntity.badRequest().body("Invalid OTP");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/2fa/verify-login")
    public ResponseEntity<?> verify2FALogin(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            int code = Integer.parseInt(request.get("code").toString());
            boolean isValid = authService.verify2FALogin(userId, code);
            if (isValid) {
                User user = authService.getUserById(userId);
                return ResponseEntity.ok(user);
            } else {
                return ResponseEntity.badRequest().body("Invalid OTP");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            authService.forgotPassword(request);
            return ResponseEntity.ok(Map.of("message", "Password reset successful."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/send-registration-otp")
    public ResponseEntity<?> sendRegistrationOtp(@RequestBody RegistrationOtpRequest request) {
        try {
            String otp = authService.sendRegistrationOtp(request.getContact());
            return ResponseEntity.ok(Map.of(
                    "message", "OTP sent successfully to your contact number.",
                    "otp", otp)); // Keep OTP in response for local/mock development only
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
