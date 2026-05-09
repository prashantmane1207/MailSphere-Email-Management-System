package com.gmail.clone.controller;

import com.gmail.clone.dto.SendMailRequest;
import com.gmail.clone.dto.UndoRequest;
import com.gmail.clone.dto.TranslateRequest;
import com.gmail.clone.dto.BulkActionRequest;
import com.gmail.clone.entity.Mail;
import com.gmail.clone.service.MailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;


@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MailController {

    private final MailService mailService;

    @PostMapping("/send")
    public ResponseEntity<?> sendMail(@RequestHeader("userId") Long userId, @RequestBody SendMailRequest request) {
        try {
            Mail mail = mailService.sendMail(
                    userId,
                    request.getReceiverEmail(),
                    request.getSubject(),
                    request.getDescription(),
                    request.isDraft(),
                    request.getAttachments(),
                    null,
                    request.getLanguage()
            );
            return ResponseEntity.ok(mail);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/schedule")
    public ResponseEntity<?> scheduleMail(@RequestHeader("userId") Long userId, @RequestBody SendMailRequest request) {
        try {
            Mail mail = mailService.sendMail(
                    userId,
                    request.getReceiverEmail(),
                    request.getSubject(),
                    request.getDescription(),
                    request.isDraft(),
                    request.getAttachments(),
                    request.getScheduledTime(),
                    request.getLanguage()
            );
            return ResponseEntity.ok(mail);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/draft")
    public ResponseEntity<?> saveDraft(@RequestHeader("userId") Long userId, @RequestBody SendMailRequest request) {
        try {
            Mail mail = mailService.sendMail(
                    userId,
                    request.getReceiverEmail(),
                    request.getSubject(),
                    request.getDescription(),
                    true,
                    request.getAttachments(),
                    null,
                    request.getLanguage()
            );
            return ResponseEntity.ok(mail);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/draft/{id}")
    public ResponseEntity<?> updateDraft(@PathVariable Long id, @RequestHeader("userId") Long userId, @RequestBody SendMailRequest request) {
        try {
            Mail mail = mailService.updateDraft(
                    id,
                    userId,
                    request.getReceiverEmail(),
                    request.getSubject(),
                    request.getDescription(),
                    request.getAttachments(),
                    request.getLanguage()
            );
            return ResponseEntity.ok(mail);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/inbox")
    public ResponseEntity<Page<Mail>> getInbox(@RequestHeader("userId") Long userId, 
                                               @RequestParam(required = false) String category,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getInbox(userId, page, size));
    }

    @GetMapping("/sent")
    public ResponseEntity<Page<Mail>> getSent(@RequestHeader("userId") Long userId,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getSent(userId, page, size));
    }

    @GetMapping("/drafts")
    public ResponseEntity<Page<Mail>> getDrafts(@RequestHeader("userId") Long userId,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getDrafts(userId, page, size));
    }

    @GetMapping("/bin")
    public ResponseEntity<Page<Mail>> getBin(@RequestHeader("userId") Long userId,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getBin(userId, page, size));
    }

    @GetMapping("/spam")
    public ResponseEntity<Page<Mail>> getSpam(@RequestHeader("userId") Long userId,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getSpam(userId, page, size));
    }

    @PatchMapping("/{id}/folder")
    public ResponseEntity<?> moveFolder(@PathVariable Long id, @RequestParam String folder, @RequestHeader("userId") Long userId) {
        mailService.moveFolder(id, folder.toUpperCase(), userId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/star")
    public ResponseEntity<Mail> toggleStar(@PathVariable Long id, @RequestHeader("userId") Long userId) {
        return ResponseEntity.ok(mailService.toggleStar(id, userId));
    }

    @PutMapping("/{id}/important")
    public ResponseEntity<Mail> toggleImportant(@PathVariable Long id, @RequestHeader("userId") Long userId) {
        return ResponseEntity.ok(mailService.toggleImportant(id, userId));
    }

    @GetMapping("/starred")
    public ResponseEntity<Page<Mail>> getStarred(@RequestHeader("userId") Long userId,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getStarred(userId, page, size));
    }

    @GetMapping("/important")
    public ResponseEntity<Page<Mail>> getImportant(@RequestHeader("userId") Long userId,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getImportant(userId, page, size));
    }

    @GetMapping("/folder/{folderName}")
    public ResponseEntity<Page<Mail>> getByFolder(@PathVariable String folderName, @RequestHeader("userId") Long userId,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getByFolder(folderName.toUpperCase(), userId, page, size));
    }

    @GetMapping("/scheduled")
    public ResponseEntity<Page<Mail>> getScheduled(@RequestHeader("userId") Long userId,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getScheduled(userId, page, size));
    }

    @PutMapping("/cancelSchedule/{id}")
    public ResponseEntity<?> cancelSchedule(@PathVariable Long id, @RequestHeader("userId") Long userId) {
        try {
            mailService.cancelSchedule(id, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/permanent/{id}")
    public ResponseEntity<?> deletePermanent(@PathVariable Long id, @RequestHeader("userId") Long userId) {
        try {
            mailService.deletePermanent(id, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/bin")
    public ResponseEntity<?> emptyTrash(@RequestHeader("userId") Long userId) {
        try {
            mailService.emptyTrash(userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Mail>> searchMails(@RequestParam(required = false) String q, @RequestHeader("userId") Long userId,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.searchMails(userId, q, page, size));
    }

    @PostMapping("/undo")
    public ResponseEntity<?> undoAction(@RequestHeader("userId") Long userId, @RequestBody UndoRequest request) {
        try {
            mailService.undoAction(userId, request);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/translate")
    public ResponseEntity<?> translate(@RequestBody TranslateRequest request) {
        try {
            String translated = mailService.translateText(request.getText(), request.getTargetLanguage());
            return ResponseEntity.ok(java.util.Map.of("translatedText", translated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/archive/{id}")
    public ResponseEntity<?> archiveMail(@PathVariable Long id, @RequestHeader("userId") Long userId) {
        try {
            mailService.moveFolder(id, "ARCHIVED", userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/unarchive/{id}")
    public ResponseEntity<?> unarchiveMail(@PathVariable Long id, @RequestHeader("userId") Long userId) {
        try {
            mailService.moveFolder(id, "INBOX", userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/archived")
    public ResponseEntity<Page<Mail>> getArchivedMails(@RequestHeader("userId") Long userId,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(mailService.getByFolder("ARCHIVED", userId, page, size));
    }

    @PostMapping("/bulk-action")
    public ResponseEntity<?> bulkAction(@RequestHeader("userId") Long userId, @RequestBody BulkActionRequest request) {
        try {
            mailService.bulkAction(userId, request);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/counts")
    public ResponseEntity<java.util.Map<String, Long>> getUnreadCounts(@RequestHeader("userId") Long userId) {
        return ResponseEntity.ok(mailService.getUnreadCounts(userId));
    }
}
