package com.gmail.clone.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "mails")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Builder.Default
    private boolean isRead = false;

    // e.g. "INBOX", "SENT", "DRAFT", "BIN"
    @Column(nullable = false)
    private String folder;

    @Builder.Default
    private boolean isStarred = false;

    @Builder.Default
    private boolean isImportant = false;

    private LocalDateTime scheduledTime;

    @Builder.Default
    private boolean isScheduled = false;

    private LocalDateTime deletedAt;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "mail_id")
    private List<Attachment> attachments;

    private String language;

    @Builder.Default
    private String category = "Primary";
}
