import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Lote } from './lote.js';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Lote', () => {
  let component: Lote;
  let fixture: ComponentFixture<Lote>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lote, HttpClientTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Lote);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
