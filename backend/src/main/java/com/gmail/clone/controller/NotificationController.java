package com.gmail.clone.controller;

import com.gmail.clone.entity.Notification;
import com.gmail.clone.repository.NotificationRepository;
import com.gmail.clone.entity.User;
import com.gmail.clone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@RequestHeader("userId") Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        return ResponseEntity.ok(notificationRepository.findAllByUserOrderByTimestampDesc(user));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        Notification notif = notificationRepository.findById(id).orElseThrow();
        notif.setRead(true);
        notificationRepository.save(notif);
        return ResponseEntity.ok().build();
    }
}
