import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-500');
  });

  it('renders with primary variant', () => {
    render(<Button variant="primary">Primary</Button>);
    
    const button = screen.getByRole('button', { name: 'Primary' });
    expect(button).toHaveClass('bg-primary-500');
    expect(button).toHaveClass('text-white');
    expect(button).toHaveClass('hover:bg-primary-600');
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    
    const button = screen.getByRole('button', { name: 'Secondary' });
    expect(button).toHaveClass('bg-secondary-500');
    expect(button).toHaveClass('text-white');
    expect(button).toHaveClass('hover:bg-secondary-600');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outline</Button>);
    
    const button = screen.getByRole('button', { name: 'Outline' });
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('border-gray-300');
    expect(button).toHaveClass('hover:bg-gray-100');
  });

  it('renders with small size', () => {
    render(<Button size="sm">Small</Button>);
    
    const button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('text-sm');
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('py-1');
  });

  it('renders with medium size', () => {
    render(<Button size="md">Medium</Button>);
    
    const button = screen.getByRole('button', { name: 'Medium' });
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('py-2');
  });

  it('renders with large size', () => {
    render(<Button size="lg">Large</Button>);
    
    const button = screen.getByRole('button', { name: 'Large' });
    expect(button).toHaveClass('text-lg');
    expect(button).toHaveClass('px-6');
    expect(button).toHaveClass('py-3');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toHaveClass('custom-class');
  });

  it('forwards additional props', () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} data-testid="test-button">
        Click me
      </Button>
    );
    
    const button = screen.getByTestId('test-button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as disabled', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
    expect(button).toHaveClass('disabled:pointer-events-none');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Button ref={ref}>Ref Button</Button>);
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });
});