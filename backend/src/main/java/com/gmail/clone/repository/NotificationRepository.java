package com.gmail.clone.repository;

import com.gmail.clone.entity.Notification;
import com.gmail.clone.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findAllByUserOrderByTimestampDesc(User user);
}
