import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { AiChatBotComponent } from '../ai-chat-bot/ai-chat-bot';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, AiChatBotComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {}

