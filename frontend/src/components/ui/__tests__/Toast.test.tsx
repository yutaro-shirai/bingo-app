import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toast, ToastContainer } from '../Toast';
import { Notification } from '@/lib/services/notifications';

const mockNotification: Notification = {
  id: '1',
  type: 'info',
  title: 'Test Notification',
  message: 'This is a test message',
  timestamp: new Date(),
  duration: 5000,
};

describe('Toast', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification content', () => {
    render(<Toast notification={mockNotification} onRemove={mockOnRemove} />);
    
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('renders success notification with correct styling', () => {
    const successNotification = { ...mockNotification, type: 'success' as const };
    render(<Toast notification={successNotification} onRemove={mockOnRemove} />);
    
    const toast = screen.getByText('Test Notification').closest('div');
    expect(toast).toHaveClass('bg-green-50', 'border-green-200');
  });

  it('renders error notification with correct styling', () => {
    const errorNotification = { ...mockNotification, type: 'error' as const };
    render(<Toast notification={errorNotification} onRemove={mockOnRemove} />);
    
    const toast = screen.getByText('Test Notification').closest('div');
    expect(toast).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('renders warning notification with correct styling', () => {
    const warningNotification = { ...mockNotification, type: 'warning' as const };
    render(<Toast notification={warningNotification} onRemove={mockOnRemove} />);
    
    const toast = screen.getByText('Test Notification').closest('div');
    expect(toast).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  it('calls onRemove when close button is clicked', async () => {
    render(<Toast notification={mockNotification} onRemove={mockOnRemove} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalledWith('1');
    }, { timeout: 500 });
  });

  it('renders notification with actions', () => {
    const notificationWithActions = {
      ...mockNotification,
      actions: [
        { label: 'Confirm', action: jest.fn(), style: 'primary' as const },
        { label: 'Cancel', action: jest.fn(), style: 'secondary' as const },
      ],
    };
    
    render(<Toast notification={notificationWithActions} onRemove={mockOnRemove} />);
    
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls action callback when action button is clicked', async () => {
    const actionCallback = jest.fn();
    const notificationWithActions = {
      ...mockNotification,
      actions: [{ label: 'Confirm', action: actionCallback, style: 'primary' as const }],
    };
    
    render(<Toast notification={notificationWithActions} onRemove={mockOnRemove} />);
    
    fireEvent.click(screen.getByText('Confirm'));
    
    expect(actionCallback).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalledWith('1');
    }, { timeout: 500 });
  });
});

describe('ToastContainer', () => {
  const mockOnRemove = jest.fn();
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'info',
      title: 'First Notification',
      timestamp: new Date(),
      duration: 5000,
    },
    {
      id: '2',
      type: 'success',
      title: 'Second Notification',
      timestamp: new Date(),
      duration: 5000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders multiple notifications', () => {
    render(<ToastContainer notifications={notifications} onRemove={mockOnRemove} />);
    
    expect(screen.getByText('First Notification')).toBeInTheDocument();
    expect(screen.getByText('Second Notification')).toBeInTheDocument();
  });

  it('renders nothing when no notifications', () => {
    const { container } = render(<ToastContainer notifications={[]} onRemove={mockOnRemove} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies correct position classes', () => {
    const { container } = render(
      <ToastContainer notifications={notifications} onRemove={mockOnRemove} position="top-left" />
    );
    
    const toastContainer = container.firstChild as HTMLElement;
    expect(toastContainer).toHaveClass('top-0', 'left-0');
  });

  it('applies default position when not specified', () => {
    const { container } = render(
      <ToastContainer notifications={notifications} onRemove={mockOnRemove} />
    );
    
    const toastContainer = container.firstChild as HTMLElement;
    expect(toastContainer).toHaveClass('top-0', 'right-0');
  });
});