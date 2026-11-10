<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStatusChanged extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $reference,
        private readonly string $status,
        private readonly string $message
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = str_replace('_', ' ', $this->status);

        return (new MailMessage)
            ->subject('OCMC application '.$this->reference.' update')
            ->greeting('An update about your OCMC application')
            ->line('Application reference: '.$this->reference)
            ->line('Status: '.ucfirst($label))
            ->line($this->message)
            ->line('Keep your application reference and private access key safe to check your application status.');
    }
}
