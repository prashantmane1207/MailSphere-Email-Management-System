package com.gmail.clone.service;

import com.gmail.clone.dto.AuthRequest;
import com.gmail.clone.dto.ForgotPasswordRequest;
import com.gmail.clone.dto.RegisterRequest;
import com.gmail.clone.entity.Mail;
import com.gmail.clone.entity.User;
import com.gmail.clone.exception.DuplicateEmailException;
import com.gmail.clone.repository.MailRepository;
import com.gmail.clone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final MailRepository mailRepository;
    private static final long OTP_EXPIRY_MILLIS = 5 * 60 * 1000L;


    public User register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        if (normalizedEmail.isBlank()) {
            throw new RuntimeException("Email is required");
        }

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateEmailException("Email already exists",
                    generateEmailSuggestions(normalizedEmail, request.getUsername()));
        }

        if (request.getContact() != null) {
            verifyRegistrationOtp(request.getContact(), request.getOtp());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(normalizedEmail)
                .password(request.getPassword()) // In real app, hash this
                .dob(request.getDob())
                .contact(request.getContact())
                .build();

        User savedUser = userRepository.save(user);

        // Send Welcome Email
        User systemUser = getOrCreateSystemUser();
        Mail welcomeMail = Mail.builder()
                .sender(systemUser)
                .receiver(savedUser)
                .subject("Welcome to JMail! Let's get started \uD83C\uDF89")
                .description("Welcome to JMail, " + savedUser.getUsername() + "!\n\n" +
                             "We are absolutely thrilled to have you on board. Your new email journey starts here.\n\n" +
                             "Explore your new inbox, customize your profile, and start connecting with the world.\n\n" +
                             "Cheers,\n" +
                             "The JMail Team")
                .timestamp(java.time.LocalDateTime.now())
                .folder("INBOX")
                .isRead(false)
                .isStarred(true)
                .isImportant(true)
                .build();
        mailRepository.save(welcomeMail);

        return savedUser;
    }

    public Object login(AuthRequest request) {
        String normalized = normalizeEmail(request.getEmail());
        System.out.println("[LOGIN DEBUG] Attempting login for normalized email: " + normalized);
        Optional<User> userOpt = userRepository.findByEmail(normalized);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            System.out.println("[LOGIN DEBUG] User found. ID: " + user.getId());
            if (user.getPassword().equals(request.getPassword().trim())) {
                if (user.is2faEnabled()) {
                    System.out.println("[LOGIN DEBUG] 2FA required for user.");
                    return Map.of("requires2fa", true, "userId", user.getId());
                }
                System.out.println("[LOGIN DEBUG] Login successful.");
                return user; // Real app: return JWT
            } else {
                System.out.println("[LOGIN DEBUG] Password mismatch!");
                System.out.println("Expected: " + user.getPassword() + ", Received: " + request.getPassword());
            }
        } else {
            System.out.println("[LOGIN DEBUG] User not found for email: " + normalized);
        }
        throw new RuntimeException("Invalid credentials");
    }

    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    public Map<String, String> setup2FA(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        user.setTwoFactorSecret(key.getKey());
        userRepository.save(user);

        String qrUrl = String.format("otpauth://totp/JMail:%s?secret=%s&issuer=JMail", user.getEmail(), key.getKey());
        String qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + URLEncoder.encode(qrUrl, StandardCharsets.UTF_8);

        return Map.of("secret", key.getKey(), "qrCodeUrl", qrImageUrl);
    }

    public boolean verify2FA(Long userId, int code) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        boolean isCodeValid = gAuth.authorize(user.getTwoFactorSecret(), code);
        if (isCodeValid) {
            user.set2faEnabled(true);
            userRepository.save(user);
            return true;
        }
        return false;
    }

    public boolean verify2FALogin(Long userId, int code) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        return gAuth.authorize(user.getTwoFactorSecret(), code);
    }

    public User getUserById(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        String newPassword = request.getNewPassword() == null ? "" : request.getNewPassword().trim();

        if (normalizedEmail.isBlank()) {
            throw new RuntimeException("Email is required");
        }
        if (newPassword.isBlank()) {
            throw new RuntimeException("New password is required");
        }
        if (newPassword.length() < 6) {
            throw new RuntimeException("New password must be at least 6 characters long");
        }

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("No account found with this email."));

        user.setPassword(newPassword); // In real app, hash this
        userRepository.save(user);
    }

    public String sendRegistrationOtp(Long contact) {
        if (contact == null || contact <= 0) {
            throw new RuntimeException("Valid contact number is required");
        }

        String otp = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));

        System.out.println("[MOCK SMS] OTP for " + contact + " is: " + otp);
        return otp;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        String trimmed = email.trim().toLowerCase();
        if (trimmed.isEmpty()) return "";
        
        if (trimmed.contains("@")) {
            return trimmed.split("@")[0] + "@jmail.com";
        }
        return trimmed + "@jmail.com";
    }

    private List<String> generateEmailSuggestions(String email, String username) {
        String[] parts = email.split("@", 2);
        String localPart = sanitizeLocalPart(parts.length > 0 ? parts[0] : "");
        String domain = "jmail.com";
        String usernameBase = sanitizeLocalPart(username == null ? "" : username.replace(" ", ""));

        List<String> bases = new ArrayList<>();
        if (!localPart.isBlank()) {
            bases.add(localPart);
        }
        if (!usernameBase.isBlank() && !bases.contains(usernameBase)) {
            bases.add(usernameBase);
        }
        if (bases.isEmpty()) {
            bases.add("user");
        }

        int[] suffixes = { 101, 123, 202, 303, 404, 505, 2026, 786, 999 };
        List<String> suggestions = new ArrayList<>();

        for (String base : bases) {
            for (int suffix : suffixes) {
                String candidate = (base + suffix + "@" + domain).toLowerCase();
                if (!userRepository.existsByEmail(candidate) && !suggestions.contains(candidate)) {
                    suggestions.add(candidate);
                }
                if (suggestions.size() == 3) {
                    return suggestions;
                }
            }

            String fallbackCandidate = (base + "_official@" + domain).toLowerCase();
            if (!userRepository.existsByEmail(fallbackCandidate) && !suggestions.contains(fallbackCandidate)) {
                suggestions.add(fallbackCandidate);
            }
            if (suggestions.size() == 3) {
                return suggestions;
            }
        }

        return suggestions;
    }

    private String sanitizeLocalPart(String value) {
        return value == null ? "" : value.toLowerCase().replaceAll("[^a-z0-9._-]", "");
    }

    private void verifyRegistrationOtp(Long contact, String otp) {
        if (otp == null || !otp.trim().matches("\\d{6}")) {
            throw new RuntimeException("Invalid OTP. Please enter any 6-digit number.");
        }
    }

    private User getOrCreateSystemUser() {
        return userRepository.findByEmail("welcome@jmail.com")
                .orElseGet(() -> {
                    User systemUser = User.builder()
                            .username("JMail Team")
                            .email("welcome@jmail.com")
                            .password("system_password_123")
                            .build();
                    return userRepository.save(systemUser);
                });
    }
}
