package com.gmail.clone.service;

import com.gmail.clone.entity.Mail;
import com.gmail.clone.entity.User;
import com.gmail.clone.repository.MailRepository;
import com.gmail.clone.repository.UserRepository;
import com.gmail.clone.repository.NotificationRepository;
import com.gmail.clone.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.gmail.clone.entity.Attachment;
import com.gmail.clone.dto.AttachmentDto;
import com.gmail.clone.dto.UndoRequest;
import com.gmail.clone.dto.BulkActionRequest;

import org.springframework.web.client.RestTemplate;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class MailService {

    private final MailRepository mailRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(5);
    private final Map<Long, ScheduledFuture<?>> pendingTasks = new ConcurrentHashMap<>();
    private final Map<String, String> translationCache = new ConcurrentHashMap<>();

    public String translateText(String text, String targetLanguage) {
        if (text == null || text.trim().isEmpty()) return text;
        String cacheKey = targetLanguage + ":" + text;
        if (translationCache.containsKey(cacheKey)) {
            return translationCache.get(cacheKey);
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            String encodedText = URLEncoder.encode(text, StandardCharsets.UTF_8.toString());
            String url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" 
                         + targetLanguage + "&dt=t&q=" + encodedText;
            String response = restTemplate.getForObject(url, String.class);
            // Quick string parsing instead of Jackson to avoid dependency issues
            // Response format: [[["translated","original",null,null,1]]]
            int firstQuote = response.indexOf("\"");
            int secondQuote = response.indexOf("\"", firstQuote + 1);
            if (firstQuote != -1 && secondQuote != -1) {
                String result = response.substring(firstQuote + 1, secondQuote);
                translationCache.put(cacheKey, result);
                return result;
            }
        } catch (Exception e) {
            System.err.println("Translation failed: " + e.getMessage());
        }
        return text; // fallback to original
    }

    public void scheduleDelayedAction(Long mailId, Runnable action) {
        ScheduledFuture<?> future = scheduler.schedule(() -> {
            action.run();
            pendingTasks.remove(mailId);
        }, 5, TimeUnit.SECONDS);
        pendingTasks.put(mailId, future);
    }

    public Mail sendMail(Long senderId, String receiverEmail, String subject, String description, boolean isDraft, List<AttachmentDto> attachmentDtos, LocalDateTime scheduledTime, String language) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        
        User receiver = userRepository.findByEmail(receiverEmail)
                .orElse(null);

        if (!isDraft && receiver == null) {
            throw new RuntimeException("Receiver not found");
        }

        List<Attachment> sentAttachments = null;
        List<Attachment> inboxAttachments = null;

        if (attachmentDtos != null) {
            sentAttachments = attachmentDtos.stream().map(dto -> Attachment.builder()
                    .filename(dto.getFilename())
                    .fileType(dto.getFileType())
                    .size(dto.getSize())
                    .data(dto.getData())
                    .build()).collect(Collectors.toList());

            inboxAttachments = attachmentDtos.stream().map(dto -> Attachment.builder()
                    .filename(dto.getFilename())
                    .fileType(dto.getFileType())
                    .size(dto.getSize())
                    .data(dto.getData())
                    .build()).collect(Collectors.toList());
        }

        boolean isScheduled = scheduledTime != null && scheduledTime.isAfter(LocalDateTime.now());

        Mail mail = Mail.builder()
                .sender(sender)
                .receiver(receiver)
                .subject(subject)
                .description(description)
                .timestamp(LocalDateTime.now())
                .isRead(false)
                .folder(isDraft ? "DRAFT" : (isScheduled ? "SCHEDULED" : "SENT"))
                .attachments(sentAttachments)
                .scheduledTime(scheduledTime)
                .isScheduled(isScheduled)
                .language(language)
                .build();

        mailRepository.save(mail);

        if (!isDraft && !isScheduled) {
            // Delay sending by 5 seconds
            List<Attachment> finalInboxAttachments = inboxAttachments;
            scheduleDelayedAction(mail.getId(), () -> {
                Mail inboxMail = Mail.builder()
                        .sender(sender)
                        .receiver(receiver)
                        .subject(subject)
                        .description(description)
                        .timestamp(mail.getTimestamp())
                        .isRead(false)
                        .folder("INBOX")
                        .attachments(finalInboxAttachments)
                        .language(language)
                        .build();
                mailRepository.save(inboxMail);
                
                // Smart Notification Logic
                boolean isSmartNotification = false;
                if (subject.toLowerCase().contains("urgent") || subject.toLowerCase().contains("important") || subject.toLowerCase().contains("priority")) {
                    isSmartNotification = true;
                }
                long contactCount = mailRepository.countBySenderAndReceiver(sender, receiver);
                if (contactCount >= 3) {
                    isSmartNotification = true;
                }
                
                if (isSmartNotification) {
                    inboxMail.setImportant(true);
                    mailRepository.save(inboxMail);
                    
                    Notification notif = new Notification();
                    notif.setUser(receiver);
                    notif.setMail(inboxMail);
                    notif.setMessage("Important email from " + (sender.getUsername() != null && !sender.getUsername().isEmpty() ? sender.getUsername() : sender.getEmail()));
                    notificationRepository.save(notif);
                    
                    messagingTemplate.convertAndSend("/topic/notifications/" + receiver.getId(), notif);
                }

                messagingTemplate.convertAndSend("/topic/inbox/" + receiver.getId(), inboxMail);
            });
        }

        return mail;
    }

    public Mail updateDraft(Long mailId, Long senderId, String receiverEmail, String subject, String description, List<AttachmentDto> attachmentDtos, String language) {
        Mail mail = mailRepository.findById(mailId).orElseThrow(() -> new RuntimeException("Mail not found"));
        if (mail.getSender() == null || !mail.getSender().getId().equals(senderId) || !"DRAFT".equals(mail.getFolder())) {
            throw new RuntimeException("Unauthorized or not a draft");
        }

        User receiver = null;
        if (receiverEmail != null && !receiverEmail.trim().isEmpty()) {
            receiver = userRepository.findByEmail(receiverEmail).orElse(null);
        }

        List<Attachment> attachments = null;
        if (attachmentDtos != null) {
            attachments = attachmentDtos.stream().map(dto -> Attachment.builder()
                    .filename(dto.getFilename())
                    .fileType(dto.getFileType())
                    .size(dto.getSize())
                    .data(dto.getData())
                    .build()).collect(Collectors.toList());
        }

        mail.setReceiver(receiver);
        mail.setSubject(subject);
        mail.setDescription(description);
        mail.setTimestamp(LocalDateTime.now());
        if (language != null) mail.setLanguage(language);
        if (attachments != null) {
            mail.setAttachments(attachments);
        }

        return mailRepository.save(mail);
    }

    public Page<Mail> getScheduled(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findBySenderAndIsScheduledTrueOrderByScheduledTimeAsc(user, PageRequest.of(page, size));
    }

    public void cancelSchedule(Long mailId, Long userId) {
        Mail mail = mailRepository.findById(mailId).orElseThrow();
        if (mail.getSender() == null || !mail.getSender().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        mail.setScheduled(false);
        mail.setFolder("DRAFT");
        mail.setScheduledTime(null);
        mailRepository.save(mail);
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void processScheduledMails() {
        List<Mail> dueMails = mailRepository.findByIsScheduledTrueAndScheduledTimeLessThanEqual(LocalDateTime.now());
        for (Mail mail : dueMails) {
            mail.setScheduled(false);
            mail.setFolder("SENT");
            mail.setTimestamp(LocalDateTime.now());
            mailRepository.save(mail);

            List<Attachment> inboxAttachments = null;
            if (mail.getAttachments() != null) {
                inboxAttachments = mail.getAttachments().stream().map(a -> Attachment.builder()
                        .filename(a.getFilename())
                        .fileType(a.getFileType())
                        .size(a.getSize())
                        .data(a.getData())
                        .build()).collect(Collectors.toList());
            }

            Mail inboxMail = Mail.builder()
                    .sender(mail.getSender())
                    .receiver(mail.getReceiver())
                    .subject(mail.getSubject())
                    .description(mail.getDescription())
                    .timestamp(mail.getTimestamp())
                    .isRead(false)
                    .folder("INBOX")
                    .attachments(inboxAttachments)
                    .language(mail.getLanguage())
                    .build();
            mailRepository.save(inboxMail);
            messagingTemplate.convertAndSend("/topic/inbox/" + mail.getReceiver().getId(), inboxMail);
        }
    }

    public Page<Mail> getInbox(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findByReceiverAndFolderOrderByTimestampDesc(user, "INBOX", PageRequest.of(page, size));
    }

    public Page<Mail> getSent(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findBySenderAndFolderOrderByTimestampDesc(user, "SENT", PageRequest.of(page, size));
    }

    public Page<Mail> getDrafts(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findBySenderAndFolderOrderByTimestampDesc(user, "DRAFT", PageRequest.of(page, size));
    }

    public Page<Mail> getBin(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findByReceiverAndFolderOrderByTimestampDesc(user, "BIN", PageRequest.of(page, size));
    }

    public Page<Mail> getSpam(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findByReceiverAndFolderOrderByTimestampDesc(user, "SPAM", PageRequest.of(page, size));
    }

    public void moveFolder(Long mailId, String folderName, Long userId) {
        Mail mail = mailRepository.findById(mailId).orElseThrow();
        boolean isReceiver = mail.getReceiver() != null && mail.getReceiver().getId().equals(userId);
        boolean isSender = mail.getSender() != null && mail.getSender().getId().equals(userId);
        if(!isReceiver && !isSender) {
             throw new RuntimeException("Unauthorized");
        }
        mail.setFolder(folderName);
        if ("BIN".equals(folderName)) {
            mail.setDeletedAt(LocalDateTime.now());
            // Optional: could schedule permanent delete here, but autoDeleteTrash handles it.
        } else if (mail.getDeletedAt() != null) {
            mail.setDeletedAt(null);
        }
        mailRepository.save(mail);
    }

    public void undoAction(Long userId, UndoRequest request) {
        Long mailId = request.getEmailId();
        Mail mail = mailRepository.findById(mailId).orElseThrow(() -> new RuntimeException("Mail not found"));

        boolean isReceiver = mail.getReceiver() != null && mail.getReceiver().getId().equals(userId);
        boolean isSender = mail.getSender() != null && mail.getSender().getId().equals(userId);
        if (!isReceiver && !isSender) {
            throw new RuntimeException("Unauthorized");
        }

        // Cancel any delayed tasks if present
        ScheduledFuture<?> future = pendingTasks.remove(mailId);
        if (future != null) {
            future.cancel(false);
        }

        switch (request.getActionType().toUpperCase()) {
            case "DELETE":
                // move from TRASH to INBOX
                mail.setFolder("INBOX");
                mail.setDeletedAt(null);
                break;
            case "ARCHIVE":
            case "ARCHIVED":
                // move back to INBOX
                mail.setFolder("INBOX");
                break;
            case "SEND":
                // mark as DRAFT
                mail.setFolder("DRAFT");
                break;
        }
        mailRepository.save(mail);
    }

    public void bulkAction(Long userId, BulkActionRequest request) {
        if (request.getEmailIds() == null || request.getEmailIds().isEmpty()) return;
        List<Mail> mails = mailRepository.findAllById(request.getEmailIds());
        for (Mail mail : mails) {
            boolean isReceiver = mail.getReceiver() != null && mail.getReceiver().getId().equals(userId);
            boolean isSender = mail.getSender() != null && mail.getSender().getId().equals(userId);
            if (!isReceiver && !isSender) continue;

            String action = request.getAction().toUpperCase();
            switch (action) {
                case "DELETE":
                    mail.setFolder("BIN");
                    mail.setDeletedAt(LocalDateTime.now());
                    break;
                case "ARCHIVE":
                    mail.setFolder("ARCHIVED"); 
                    break;
                case "READ":
                    mail.setRead(true);
                    break;
                case "UNREAD":
                    mail.setRead(false);
                    break;
                default:
                    // If action starts with "LABEL:", it's a label application
                    if (action.startsWith("LABEL:")) {
                        mail.setFolder(request.getAction().substring(6));
                    }
                    break;
            }
        }
        mailRepository.saveAll(mails);
    }

    public void deletePermanent(Long mailId, Long userId) {
        Mail mail = mailRepository.findById(mailId).orElseThrow();
        boolean isReceiver = mail.getReceiver() != null && mail.getReceiver().getId().equals(userId);
        boolean isSender = mail.getSender() != null && mail.getSender().getId().equals(userId);
        if(!isReceiver && !isSender) {
             throw new RuntimeException("Unauthorized");
        }
        mailRepository.delete(mail);
    }

    public void emptyTrash(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        List<Mail> receiverTrash = mailRepository.findByReceiverAndFolderOrderByTimestampDesc(user, "BIN");
        List<Mail> senderTrash = mailRepository.findBySenderAndFolderOrderByTimestampDesc(user, "BIN");
        mailRepository.deleteAll(receiverTrash);
        mailRepository.deleteAll(senderTrash);
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 0 * * ?") // Daily at midnight
    public void autoDeleteTrash() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<Mail> oldTrash = mailRepository.findByFolderAndDeletedAtLessThanEqual("BIN", thirtyDaysAgo);
        mailRepository.deleteAll(oldTrash);
    }

    public Mail toggleStar(Long mailId, Long userId) {
        Mail mail = mailRepository.findById(mailId).orElseThrow();
        if (mail.getReceiver() == null || !mail.getReceiver().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        mail.setStarred(!mail.isStarred());
        return mailRepository.save(mail);
    }

    public Mail toggleImportant(Long mailId, Long userId) {
        Mail mail = mailRepository.findById(mailId).orElseThrow();
        if (mail.getReceiver() == null || !mail.getReceiver().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        mail.setImportant(!mail.isImportant());
        return mailRepository.save(mail);
    }

    public Page<Mail> getStarred(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findByReceiverAndIsStarredTrueOrderByTimestampDesc(user, PageRequest.of(page, size));
    }

    public Page<Mail> getImportant(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findByReceiverAndIsImportantTrueOrderByTimestampDesc(user, PageRequest.of(page, size));
    }

    public Page<Mail> getByFolder(String folderName, Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        return mailRepository.findByReceiverAndFolder(user, folderName, PageRequest.of(page, size));
    }

    public Page<Mail> searchMails(Long userId, String query, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow();
        
        return mailRepository.findAll((root, cq, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            
            // Security: must be sender or receiver
            jakarta.persistence.criteria.Predicate isSender = cb.equal(root.get("sender"), user);
            jakarta.persistence.criteria.Predicate isReceiver = cb.equal(root.get("receiver"), user);
            predicates.add(cb.or(isSender, isReceiver));

            // Exclude BIN from normal search
            predicates.add(cb.notEqual(root.get("folder"), "BIN"));

            if (query == null || query.trim().isEmpty()) {
                return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
            }

            String[] tokens = query.split(" ");
            StringBuilder genericText = new StringBuilder();

            for (String token : tokens) {
                if (token.startsWith("from:")) {
                    String fromStr = token.substring(5).toLowerCase();
                    predicates.add(cb.like(cb.lower(root.join("sender", jakarta.persistence.criteria.JoinType.LEFT).get("email")), "%" + fromStr + "%"));
                } else if (token.startsWith("to:")) {
                    String toStr = token.substring(3).toLowerCase();
                    predicates.add(cb.like(cb.lower(root.join("receiver", jakarta.persistence.criteria.JoinType.LEFT).get("email")), "%" + toStr + "%"));
                } else if (token.startsWith("subject:")) {
                    String subjStr = token.substring(8).toLowerCase();
                    predicates.add(cb.like(cb.lower(root.get("subject")), "%" + subjStr + "%"));
                } else if (token.equals("has:attachment")) {
                    predicates.add(cb.isNotEmpty(root.get("attachments")));
                } else if (token.startsWith("before:")) {
                    try {
                        LocalDateTime beforeDate = java.time.LocalDate.parse(token.substring(7)).atStartOfDay();
                        predicates.add(cb.lessThan(root.get("timestamp"), beforeDate));
                    } catch (Exception ignored) {}
                } else if (token.startsWith("after:")) {
                    try {
                        LocalDateTime afterDate = java.time.LocalDate.parse(token.substring(6)).atStartOfDay();
                        predicates.add(cb.greaterThan(root.get("timestamp"), afterDate));
                    } catch (Exception ignored) {}
                } else {
                    genericText.append(token).append(" ");
                }
            }

            String text = genericText.toString().trim().toLowerCase();
            if (!text.isEmpty()) {
                jakarta.persistence.criteria.Predicate subjMatch = cb.like(cb.lower(root.get("subject")), "%" + text + "%");
                jakarta.persistence.criteria.Predicate descMatch = cb.like(cb.lower(root.get("description")), "%" + text + "%");
                predicates.add(cb.or(subjMatch, descMatch));
            }

            cq.orderBy(cb.desc(root.get("timestamp")));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        }, PageRequest.of(page, size));
    }

    public java.util.Map<String, Long> getUnreadCounts(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        return java.util.Map.of(
            "Primary", mailRepository.countByReceiverAndFolderAndCategoryAndIsReadFalse(user, "INBOX", "Primary"),
            "Promotions", mailRepository.countByReceiverAndFolderAndCategoryAndIsReadFalse(user, "INBOX", "Promotions"),
            "Social", mailRepository.countByReceiverAndFolderAndCategoryAndIsReadFalse(user, "INBOX", "Social"),
            "Updates", mailRepository.countByReceiverAndFolderAndCategoryAndIsReadFalse(user, "INBOX", "Updates")
        );
    }
}
