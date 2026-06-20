import { useState, useRef, ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { playCompletionFeedback } from '@/utils/audioUtils';

function StarRating({ value, onChange, idPrefix }: { value: number; onChange: (n: number) => void; idPrefix: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating" id={`${idPrefix}-star-rating`}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <span
          key={n}
          className={`star${n <= value ? ' filled' : ''}${n <= hover ? ' hover' : ''}`}
          onClick={() => onChange(value === n ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
        >★</span>
      ))}
    </div>
  );
}

export function Food() {
  const { data: restaurants = [] } = useQuery<string[]>({
    queryKey: ['food-restaurants'],
    queryFn: async () => {
      const res = await fetch('/food/restaurants');
      const d = await res.json();
      return d.restaurants ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [mode, setMode] = useState<'restaurant' | 'homemade'>('restaurant');
  const [restaurant, setRestaurant] = useState('');
  const [dish, setDish] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<File | null>(null);

  function onPhotoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    photoRef.current = file;
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setDish(''); setRestaurant(''); setCost(''); setNotes(''); setRating(0);
    setPhotoPreview(null); photoRef.current = null;
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submitReview() {
    setFeedback('');
    if (!dish) { setFeedbackOk(false); setFeedback('Dish name is required.'); return; }
    if (mode === 'restaurant' && !restaurant) { setFeedbackOk(false); setFeedback('Restaurant name is required.'); return; }
    if (!rating) { setFeedbackOk(false); setFeedback('Please select a rating.'); return; }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('mode', mode);
    formData.append('dish', dish);
    formData.append('rating', String(rating));
    if (mode === 'restaurant') formData.append('restaurant', restaurant);
    if (cost) formData.append('cost', cost);
    if (notes) formData.append('notes', notes);
    if (photoRef.current) formData.append('photo', photoRef.current);

    try {
      const res = await fetch('/food/submit', { method: 'POST', body: formData });
      const d = await res.json();
      if (res.ok) {
        playCompletionFeedback();
        setFeedbackOk(true);
        setFeedback('Review saved!');
        resetForm();
      } else {
        setFeedbackOk(false);
        setFeedback(d.error ?? 'Failed to save.');
      }
    } catch (_) {
      setFeedbackOk(false);
      setFeedback('Request failed.');
    }
    setSubmitting(false);
  }

  return (
    <div className="tab-panel active" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="food-container">
        <div className="card food-card">
          <label className="food-photo-area" htmlFor="food-photo-input">
            {photoPreview
              ? <img className="food-photo-img" src={photoPreview} alt="Meal photo" />
              : (
                <div className="food-photo-placeholder">
                  <span className="food-photo-icon">📷</span>
                  <span>Tap to add photo</span>
                </div>
              )
            }
            {photoPreview && <span className="food-photo-change">Change</span>}
          </label>
          <input
            ref={fileRef}
            id="food-photo-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onPhotoSelected}
          />

          <div className="food-mode-toggle">
            <button
              className={`food-mode-btn${mode === 'restaurant' ? ' active' : ''}`}
              onClick={() => setMode('restaurant')}
            >🍽️ Restaurant</button>
            <button
              className={`food-mode-btn${mode === 'homemade' ? ' active' : ''}`}
              onClick={() => setMode('homemade')}
            >🏠 Home-made</button>
          </div>

          {mode === 'restaurant' && (
            <div className="form-row">
              <input
                type="text"
                value={restaurant}
                onChange={e => setRestaurant(e.target.value)}
                placeholder="Restaurant name"
                list="food-restaurant-list"
                autoComplete="off"
              />
              <datalist id="food-restaurant-list">
                {restaurants.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
          )}

          <div className="form-row">
            <input type="text" value={dish} onChange={e => setDish(e.target.value)} placeholder="Dish / meal name" />
          </div>

          <div className="food-meta-row">
            <div className="food-meta-group">
              <span className="food-label">Rating</span>
              <StarRating value={rating} onChange={setRating} idPrefix="food" />
              <span className="music-rating-text">{rating > 0 ? `${rating}/10` : '-/10'}</span>
            </div>
            <div className="food-meta-group">
              <span className="food-label">Cost</span>
              <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Optional" step="0.01" min="0" />
            </div>
          </div>

          <textarea className="food-notes" placeholder="Notes…" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />

          <button className="food-submit-btn" onClick={submitReview} disabled={submitting} title="Save Review">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>

          <div className={`feedback${feedbackOk ? ' ok' : feedback ? ' err' : ''}`}>{feedback}</div>
        </div>
      </div>
    </div>
  );
}
