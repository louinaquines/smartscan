export const formatMoney = (amount: number) =>
    `₱ ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export const formatShortDate = (iso: string) =>
    new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(iso));
