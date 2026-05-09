package com.gmail.clone.repository;

import com.gmail.clone.entity.Mail;
import com.gmail.clone.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface MailRepository extends JpaRepository<Mail, Long>, JpaSpecificationExecutor<Mail> {
    List<Mail> findByReceiverAndFolderOrderByTimestampDesc(User receiver, String folder);
    Page<Mail> findByReceiverAndFolderOrderByTimestampDesc(User receiver, String folder, Pageable pageable);
    Page<Mail> findByReceiverAndFolderAndCategoryIgnoreCaseOrderByTimestampDesc(User receiver, String folder, String category, Pageable pageable);
    
    List<Mail> findBySenderAndFolderOrderByTimestampDesc(User sender, String folder);
    Page<Mail> findBySenderAndFolderOrderByTimestampDesc(User sender, String folder, Pageable pageable);
    
    List<Mail> findByReceiverAndIsStarredTrueOrderByTimestampDesc(User receiver);
    Page<Mail> findByReceiverAndIsStarredTrueOrderByTimestampDesc(User receiver, Pageable pageable);
    
    List<Mail> findByReceiverAndIsImportantTrueOrderByTimestampDesc(User receiver);
    Page<Mail> findByReceiverAndIsImportantTrueOrderByTimestampDesc(User receiver, Pageable pageable);
    
    List<Mail> findBySenderAndIsScheduledTrueOrderByScheduledTimeAsc(User sender);
    Page<Mail> findBySenderAndIsScheduledTrueOrderByScheduledTimeAsc(User sender, Pageable pageable);
    
    List<Mail> findByIsScheduledTrueAndScheduledTimeLessThanEqual(java.time.LocalDateTime time);
    List<Mail> findByFolderAndDeletedAtLessThanEqual(String folder, java.time.LocalDateTime time);
    
    List<Mail> findByReceiverAndFolder(User receiver, String folder);
    Page<Mail> findByReceiverAndFolder(User receiver, String folder, Pageable pageable);
    
    long countBySenderAndReceiver(User sender, User receiver);
    long countByReceiverAndFolderAndCategoryAndIsReadFalse(User receiver, String folder, String category);
}
